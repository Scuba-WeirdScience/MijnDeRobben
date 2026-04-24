using MemberApi.Data;
using MemberApi.Data.Seed;
using MemberApi.Hubs;
using MemberApi.Middleware;
using MemberApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<MemberDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("GatewayDb"));
    // Migrations are hand-written SQL scripts (see migrations/). EF model will always
    // be ahead of __EFMigrationsHistory — suppress the resulting warning.
    options.ConfigureWarnings(w =>
        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// Services
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IBrevetService, BrevetService>();
builder.Services.AddScoped<ISpecialtyTypeService, SpecialtyTypeService>();
builder.Services.AddScoped<IBrevetTypeDefinitionService, BrevetTypeDefinitionService>();
builder.Services.AddScoped<IMemberOrganisatieService, MemberOrganisatieService>();
builder.Services.AddScoped<IMateriaalTypeService, MateriaalTypeService>();
builder.Services.AddScoped<IMateriaalService, MateriaalService>();
builder.Services.AddScoped<ILeningService, LeningService>();
builder.Services.AddScoped<IBerichtService, BerichtService>();

// Auth (claims from trusted gateway headers — no JWT validation here)
builder.Services.AddAuthentication("GatewayHeader")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions,
               GatewayHeaderAuthHandler>("GatewayHeader", _ => { });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Seed database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MemberDbContext>();
    await DatabaseSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

// Serve uploaded avatars as static files (e.g. /uploads/avatars/...)
var avatarDir = Path.Combine(app.Environment.WebRootPath
    ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "avatars");
Directory.CreateDirectory(avatarDir);
app.UseStaticFiles();

app.MapControllers();
app.MapHub<BerichtenHub>("/hubs/berichten");

app.Run();
