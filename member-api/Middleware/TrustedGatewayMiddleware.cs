using Microsoft.AspNetCore.Http;

namespace MemberApi.Middleware;

/// <summary>
/// Validates that every request originates from the trusted API Gateway
/// by checking a shared secret header. Rejects direct access to the member-api.
/// </summary>
public class TrustedGatewayMiddleware(RequestDelegate next, IConfiguration config)
{
    private const string HeaderName = "X-Gateway-Secret";

    public async Task InvokeAsync(HttpContext context)
    {
        var expectedSecret = config["Gateway:SharedSecret"];

        if (string.IsNullOrEmpty(expectedSecret))
        {
            // Secret not configured — skip in development if desired
            await next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(HeaderName, out var providedSecret) ||
            !string.Equals(providedSecret, expectedSecret, StringComparison.Ordinal))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = "Direct access is not allowed." });
            return;
        }

        // Forward user context from headers injected by gateway
        var userId = context.Request.Headers["X-User-Id"].FirstOrDefault();
        var userEmail = context.Request.Headers["X-User-Email"].FirstOrDefault();
        var userRoles = context.Request.Headers["X-User-Roles"].FirstOrDefault();

        if (!string.IsNullOrEmpty(userId))
        {
            var claims = new List<System.Security.Claims.Claim>
            {
                new(System.Security.Claims.ClaimTypes.NameIdentifier, userId)
            };

            if (!string.IsNullOrEmpty(userEmail))
                claims.Add(new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, userEmail));

            if (!string.IsNullOrEmpty(userRoles))
                foreach (var role in userRoles.Split(',', StringSplitOptions.RemoveEmptyEntries))
                    claims.Add(new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, role.Trim()));

            var identity = new System.Security.Claims.ClaimsIdentity(claims, "GatewayHeader");
            context.User = new System.Security.Claims.ClaimsPrincipal(identity);
        }

        await next(context);
    }
}
