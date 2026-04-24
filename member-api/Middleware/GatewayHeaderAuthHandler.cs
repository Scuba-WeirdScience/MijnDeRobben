using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace MemberApi.Middleware;

/// <summary>
/// Authentication handler that validates the shared gateway secret header
/// and builds a ClaimsPrincipal from the X-User-* headers injected by the gateway.
/// Replaces both the old dummy handler and TrustedGatewayMiddleware.
/// </summary>
public class GatewayHeaderAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration config)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    private const string SecretHeader = "X-Gateway-Secret";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var expectedSecret = config["Gateway:SharedSecret"];

        // In development the secret may be empty — allow all requests through
        if (!string.IsNullOrEmpty(expectedSecret))
        {
            if (!Request.Headers.TryGetValue(SecretHeader, out var providedSecret) ||
                !string.Equals(providedSecret, expectedSecret, StringComparison.Ordinal))
            {
                return Task.FromResult(AuthenticateResult.Fail("Missing or invalid gateway secret."));
            }
        }

        var userId    = Request.Headers["X-User-Id"].FirstOrDefault();
        var userEmail = Request.Headers["X-User-Email"].FirstOrDefault();
        var userRoles = Request.Headers["X-User-Roles"].FirstOrDefault();

        if (string.IsNullOrEmpty(userId))
            return Task.FromResult(AuthenticateResult.NoResult());

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId)
        };

        if (!string.IsNullOrEmpty(userEmail))
            claims.Add(new Claim(ClaimTypes.Email, userEmail));

        if (!string.IsNullOrEmpty(userRoles))
            foreach (var role in userRoles.Split(',', StringSplitOptions.RemoveEmptyEntries))
                claims.Add(new Claim(ClaimTypes.Role, role.Trim()));

        var identity  = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket    = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
