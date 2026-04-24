using System.Security.Claims;

namespace ApiGateway.Middleware;

/// <summary>
/// Injects the shared gateway secret and user context headers
/// before YARP forwards the request to downstream services.
/// </summary>
public class GatewaySecretInjectionMiddleware(RequestDelegate next, IConfiguration config)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var secret = config["Gateway:SharedSecret"];

        if (!string.IsNullOrEmpty(secret))
            context.Request.Headers["X-Gateway-Secret"] = secret;

        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = context.User.FindFirstValue(ClaimTypes.Email)
                        ?? context.User.FindFirstValue("email");
            var roles = context.User.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value);

            if (!string.IsNullOrEmpty(userId))
                context.Request.Headers["X-User-Id"] = userId;

            if (!string.IsNullOrEmpty(email))
                context.Request.Headers["X-User-Email"] = email;

            var rolesValue = string.Join(",", roles);
            if (!string.IsNullOrEmpty(rolesValue))
                context.Request.Headers["X-User-Roles"] = rolesValue;
        }

        await next(context);
    }
}
