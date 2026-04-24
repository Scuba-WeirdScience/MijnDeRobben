namespace MemberApi.DTOs;

public record BrevetDto(
    Guid Id,
    Guid MemberId,
    string BrevetType,
    string Organisatie,
    string? OrganisatieNaam,
    string Niveau,
    string? BehaaldDatum,
    string? Notities,
    string CreatedAt,
    string? UpdatedAt
);

public record CreateBrevetDto(
    string BrevetType,
    string Organisatie,
    string? OrganisatieNaam,
    string Niveau,
    string? BehaaldDatum,
    string? Notities
);

public record UpdateBrevetDto(
    string BrevetType,
    string Organisatie,
    string? OrganisatieNaam,
    string Niveau,
    string? BehaaldDatum,
    string? Notities
);
