using System.Text;
using System.Text.Json.Serialization;
using ApiGateway.Configuration;
using ApiGateway.Data;
using ApiGateway.Middleware;
using ApiGateway.Models;
using ApiGateway.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Database ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<GatewayDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("GatewayDb")));

// ── Identity ───────────────────────────────────────────────────────────────
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = true;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<GatewayDbContext>()
.AddDefaultTokenProviders();

// ── JWT Configuration ──────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
builder.Services.Configure<JwtOptions>(jwtSection);
var jwtOptions = jwtSection.Get<JwtOptions>()!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidAudience = jwtOptions.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtOptions.Secret)),
        ClockSkew = TimeSpan.Zero
    };
    // Allow SignalR to send the JWT via query string (WebSockets can't set headers)
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) &&
                ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// ── Services ───────────────────────────────────────────────────────────────
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IMemberSyncService, MemberSyncService>();

// Named HTTP client for member-api (base address from config or default dev URL)
builder.Services.AddHttpClient("MemberApi", (sp, client) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var baseUrl = config["MemberApi:BaseUrl"] ?? "http://localhost:5107/";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(15);

    var secret = config["Gateway:SharedSecret"];
    if (!string.IsNullOrEmpty(secret))
        client.DefaultRequestHeaders.Add("X-Gateway-Secret", secret);
});

// ── CORS ───────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("Angular", policy =>
    {
        policy
            .WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                ?? ["http://localhost:4300"])
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// ── YARP ───────────────────────────────────────────────────────────────────
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ── Migrate & Seed ─────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GatewayDbContext>();
    await db.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    string[] roles = ["Beheer", "Admin", "Lid", "Bestuur", "MateriaalCommissie", "InstructieKader"];
    foreach (var role in roles)
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));

    // Seed users
    var seedUsers = new[]
    {
        new { Email = "admin@example.com",    Password = "Admin@12345", Roles = new[] { "Beheer", "InstructieKader" } },
        new { Email = "admin@scubaclub.be",  Password = "Test@12345",  Roles = new[] { "Beheer" } },
        new { Email = "jan@scubaclub.be",    Password = "Test@12345",  Roles = Array.Empty<string>() },
    };

    foreach (var seed in seedUsers)
    {
        if (await userManager.FindByEmailAsync(seed.Email) is not null) continue;

        var newUser = new ApplicationUser
        {
            UserName = seed.Email,
            Email = seed.Email,
            EmailConfirmed = true
        };
        var createResult = await userManager.CreateAsync(newUser, seed.Password);
        if (!createResult.Succeeded) continue;

        foreach (var role in seed.Roles)
            if (await roleManager.RoleExistsAsync(role))
                await userManager.AddToRoleAsync(newUser, role);
    }

    // ── Startup reconciliation ─────────────────────────────────────────────
    // Ensure every gateway user has the Lid role. (Member records are bootstrapped on login.)
    var allUsers = await userManager.Users.ToListAsync();
    foreach (var u in allUsers)
    {
        if (!await userManager.IsInRoleAsync(u, "Lid") && await roleManager.RoleExistsAsync("Lid"))
            await userManager.AddToRoleAsync(u, "Lid");
    }
}

// ── Middleware pipeline ────────────────────────────────────────────────────
app.UseCors("Angular");
app.UseWebSockets();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

// Inject gateway secret + user headers before YARP forwards
app.UseMiddleware<GatewaySecretInjectionMiddleware>();

app.MapControllers();
app.MapReverseProxy();

app.Run();
