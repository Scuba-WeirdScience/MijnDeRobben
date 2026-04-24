using ApiGateway.Configuration;
using ApiGateway.DTOs;
using ApiGateway.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace ApiGateway.Services;

public interface IUserService
{
    Task<LoginResult> LoginAsync(LoginRequestDto dto);
    Task<(LoginResponseDto? Response, string? Error)> RegisterAsync(RegisterRequestDto dto, bool callerIsBeheer);
    Task<LoginResponseDto?> RefreshAsync(string userId, string refreshToken);
    Task<IList<string>> GetRolesAsync(string userId);
    Task<(bool Success, string? Error)> AssignRoleAsync(string userId, string role);
    Task<(bool Success, string? Error)> RemoveRoleAsync(string userId, string role);
    Task<(bool Success, string? Error)> UpdateUserAsync(string userId, UpdateUserDto dto);
    Task<(bool Success, string? Error)> ResetPasswordAsync(string userId, string newPassword);
    Task EnsureLidRoleAsync(ApplicationUser user);
}

public class UserService(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    RoleManager<IdentityRole> roleManager,
    IJwtService jwtService,
    IOptions<JwtOptions> jwtOptions,
    IMemberSyncService memberSyncService) : IUserService
{
    private readonly JwtOptions _jwtOpts = jwtOptions.Value;

    // Thread-safe in-memory refresh token store (replace with DB in production)
    private static readonly ConcurrentDictionary<string, (string Token, DateTime Expiry)> RefreshTokens = new();

    public async Task<LoginResult> LoginAsync(LoginRequestDto dto)
    {
        // Step 1 — Verify credentials
        var user = await userManager.FindByEmailAsync(dto.Email);
        if (user is null) return new LoginFailure();

        var signInResult = await signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!signInResult.Succeeded) return new LoginFailure();

        await EnsureLidRoleAsync(user);

        // Step 2 — Check IsActive (always blocks login regardless of validation state)
        // IsActive and IsValidated now live directly on ApplicationUser — no HTTP call needed.
        if (!user.IsActive) return new AccountInactive();

        // Step 3 — Check IsValidated; if not validated, handle geboortedatum flow
        if (!user.IsValidated)
        {
            // No geboortedatum supplied — ask the client to provide it
            if (string.IsNullOrWhiteSpace(dto.Geboortedatum))
                return new ValidationRequired();

            // Geboortedatum supplied — validate locally and mark as validated
            if (!DateOnly.TryParse(dto.Geboortedatum, out var submitted))
                return new InvalidDateOfBirth();

            if (user.DateOfBirth.HasValue && user.DateOfBirth.Value != submitted)
                return new InvalidDateOfBirth();

            // Match — persist validated state
            user.IsValidated = true;
            await userManager.UpdateAsync(user);
        }

        // Step 4 — Bootstrap member record in member-api (for brevetten/orgs)
        // This is fire-and-forget; failures are non-fatal.
        _ = memberSyncService.LinkOrCreateAsync(user.Id);

        // Step 5 — All checks passed — issue tokens
        var tokens = await GenerateTokensAsync(user);
        return new LoginSuccess(tokens);
    }

    public async Task<(LoginResponseDto? Response, string? Error)> RegisterAsync(
        RegisterRequestDto dto, bool callerIsBeheer)
    {
        var existingUser = await userManager.FindByEmailAsync(dto.Email);
        if (existingUser is not null)
            return (null, "Email already in use.");

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
            return (null, string.Join("; ", createResult.Errors.Select(e => e.Description)));

        // Assign roles — only Beheer can assign roles on registration
        if (dto.Roles is { Length: > 0 } && callerIsBeheer)
        {
            foreach (var role in dto.Roles)
            {
                if (await roleManager.RoleExistsAsync(role))
                    await userManager.AddToRoleAsync(user, role);
            }
        }
        else
        {
            // Default role for self-registration
            if (await roleManager.RoleExistsAsync("Lid"))
                await userManager.AddToRoleAsync(user, "Lid");
        }

        await EnsureLidRoleAsync(user);

        // Bootstrap member record (fire-and-forget)
        _ = memberSyncService.LinkOrCreateAsync(user.Id);

        var response = await GenerateTokensAsync(user);
        return (response, null);
    }

    public async Task<LoginResponseDto?> RefreshAsync(string userId, string refreshToken)
    {
        if (!RefreshTokens.TryGetValue(userId, out var stored)) return null;
        if (stored.Token != refreshToken || stored.Expiry < DateTime.UtcNow) return null;

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return null;

        return await GenerateTokensAsync(user);
    }

    public async Task<IList<string>> GetRolesAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        return user is null ? [] : await userManager.GetRolesAsync(user);
    }

    public async Task<(bool Success, string? Error)> AssignRoleAsync(string userId, string role)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return (false, "User not found.");
        if (!await roleManager.RoleExistsAsync(role)) return (false, "Role does not exist.");

        var result = await userManager.AddToRoleAsync(user, role);
        return result.Succeeded
            ? (true, null)
            : (false, string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<(bool Success, string? Error)> RemoveRoleAsync(string userId, string role)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return (false, "User not found.");

        var result = await userManager.RemoveFromRoleAsync(user, role);
        return result.Succeeded
            ? (true, null)
            : (false, string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<(bool Success, string? Error)> UpdateUserAsync(string userId, UpdateUserDto dto)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return (false, "User not found.");

        if (dto.Email is not null)
        {
            var existing = await userManager.FindByEmailAsync(dto.Email);
            if (existing is not null && existing.Id != userId)
                return (false, "Email already in use.");

            user.Email = dto.Email;
            user.UserName = dto.Email;
            user.NormalizedEmail = userManager.NormalizeEmail(dto.Email);
            user.NormalizedUserName = userManager.NormalizeName(dto.Email);
        }

        if (dto.FirstName is not null) user.FirstName = dto.FirstName;
        if (dto.LastName is not null) user.LastName = dto.LastName;

        var result = await userManager.UpdateAsync(user);
        return result.Succeeded
            ? (true, null)
            : (false, string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task<(bool Success, string? Error)> ResetPasswordAsync(string userId, string newPassword)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return (false, "User not found.");

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, newPassword);
        return result.Succeeded
            ? (true, null)
            : (false, string.Join("; ", result.Errors.Select(e => e.Description)));
    }

    public async Task EnsureLidRoleAsync(ApplicationUser user)
    {
        if (!await userManager.IsInRoleAsync(user, "Lid"))
        {
            if (await roleManager.RoleExistsAsync("Lid"))
                await userManager.AddToRoleAsync(user, "Lid");
        }
    }

    private async Task<LoginResponseDto> GenerateTokensAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var accessToken = jwtService.GenerateAccessToken(user.Id, user.Email!, roles);
        var refreshToken = jwtService.GenerateRefreshToken();

        RefreshTokens[user.Id] = (refreshToken, DateTime.UtcNow.AddDays(_jwtOpts.RefreshTokenExpiryDays));

        return new LoginResponseDto(
            accessToken,
            refreshToken,
            _jwtOpts.AccessTokenExpiryMinutes * 60
        );
    }
}
