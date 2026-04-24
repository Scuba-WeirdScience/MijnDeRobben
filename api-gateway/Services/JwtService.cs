using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ApiGateway.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ApiGateway.Services;

public interface IJwtService
{
    string GenerateAccessToken(string userId, string email, IEnumerable<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateRefreshToken(string token);
}

public class JwtService(IOptions<JwtOptions> jwtOptions) : IJwtService
{
    private readonly JwtOptions _opts = jwtOptions.Value;

    public string GenerateAccessToken(string userId, string email, IEnumerable<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat,
                DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64)
        };

        claims.AddRange(roles.Select(r => new Claim("role", r)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opts.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _opts.Issuer,
            audience: _opts.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_opts.AccessTokenExpiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public ClaimsPrincipal? ValidateRefreshToken(string token)
    {
        // For simplicity, refresh tokens are stored as opaque strings in Identity.
        // Full validation (expiry, rotation) is handled in UserService.
        return null;
    }
}
