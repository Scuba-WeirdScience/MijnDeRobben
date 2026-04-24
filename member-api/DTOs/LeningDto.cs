namespace MemberApi.DTOs;

/// <summary>Minimal member info for UI display — avatar + name.</summary>
public record MemberDisplayDto(
    Guid Id,
    string FirstName,
    string LastName,
    string? AvatarUrl
);

public record MijnLeningDto(
    Guid Id,
    Guid MateriaalId,
    string MateriaalNaam,
    string? MateriaalTypeNaam,
    string? Serienummer,
    DateOnly UitgeleendDatum,
    string CreatedAt
);

public record MateriaalLeningStatusDto(
    bool IsLent,
    Guid? HuidigeLeningId,
    string? HuidigeLenerNaam,
    DateOnly? UitgeleendDatum,
    bool IsMijnLening,
    string? Message,
    string? MateriaalNaam,
    string? MateriaalTypeNaam
);

public record TakeLeningDto(Guid MateriaalId);

public record ReturnLeningDto(string? Notities);

public record LeningDto(
    Guid Id,
    Guid MateriaalId,
    string MateriaalNaam,
    Guid MemberId,
    MemberDisplayDto? Member,
    DateOnly UitgeleendDatum,
    DateOnly? Retourdatum,
    string? Notities,
    string CreatedAt
);
