namespace ApiGateway.DTOs;

public record LoginRequestDto(
    string Email,
    string Password,
    string? Geboortedatum = null
);

public record LoginResponseDto(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string TokenType = "Bearer"
);

/// <summary>
/// Error response body returned by the auth controller for non-200 login outcomes.
/// RequiresValidation is only included in the JSON when true (null = omitted).
/// </summary>
public record LoginErrorDto(
    string Error,
    bool? RequiresValidation = null
);

public record RegisterRequestDto(
    string Email,
    string Password,
    string[]? Roles = null
);

public record RefreshTokenRequestDto(string RefreshToken);

public record AssignRoleDto(string Role);

public record UserSummaryDto(
    string Id,
    string Email,
    string? FirstName,
    string? LastName,
    bool IsActive,
    bool IsValidated
);

public record UpdateUserDto(string? Email, string? FirstName, string? LastName);

public record ResetPasswordDto(string NewPassword);
