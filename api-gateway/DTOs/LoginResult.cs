namespace ApiGateway.DTOs;

/// <summary>
/// Discriminated union representing every possible outcome of UserService.LoginAsync.
/// Use a switch expression to handle all cases exhaustively.
/// </summary>
public abstract record LoginResult;

/// <summary>Password correct, member active and validated — tokens issued.</summary>
public sealed record LoginSuccess(LoginResponseDto Tokens) : LoginResult;

/// <summary>User not found or password incorrect.</summary>
public sealed record LoginFailure : LoginResult;

/// <summary>Member record has IsActive = false.</summary>
public sealed record AccountInactive : LoginResult;

/// <summary>
/// Member record has IsValidated = false and no geboortedatum was supplied.
/// The client must re-submit with geboortedatum to complete validation.
/// </summary>
public sealed record ValidationRequired : LoginResult;

/// <summary>
/// Member record has IsValidated = false, geboortedatum was supplied,
/// but did not match the stored date-of-birth.
/// </summary>
public sealed record InvalidDateOfBirth : LoginResult;
