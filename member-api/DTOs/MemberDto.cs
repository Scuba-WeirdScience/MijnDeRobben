namespace MemberApi.DTOs;

public record MemberDto(
    Guid Id,
    string UserId,
    string FirstName,
    string LastName,
    string DateOfBirth,
    string JoinDate,
    bool IsActive,
    bool IsValidated,
    string CreatedAt,
    string? UpdatedAt,
    string? AvatarUrl
);

public record CreateMemberDto(
    string UserId,
    string FirstName,
    string LastName,
    string DateOfBirth,
    string? JoinDate,
    bool? IsActive
);

public record UpdateMemberDto(
    string? FirstName,
    string? LastName,
    string? DateOfBirth,
    string? JoinDate,
    bool? IsActive
);

/// <summary>
/// Payload sent by the gateway to ensure a Member row exists for this userId.
/// </summary>
public record LinkOrCreateDto(string UserId);

/// <summary>
/// Lightweight status DTO returned to the api-gateway during login checks.
/// Kept here so member-api can still serve the existing contract while
/// the gateway reads IsActive/IsValidated locally from ApplicationUser.
/// </summary>
public record MemberStatusDto(bool IsActive, bool IsValidated);

public record PagedResult<T>(
    IEnumerable<T> Items,
    int Total,
    int Page,
    int PageSize
);
