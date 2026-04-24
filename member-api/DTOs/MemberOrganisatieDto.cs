namespace MemberApi.DTOs;

// ── Nested brevet summary used inside MemberOrganisatieDto ───────────────────

public record BrevetSummaryDto(
    Guid   Id,
    string BrevetType,
    string Niveau,
    string? BehaaldDatum,
    string? Notities
);

// ── Main DTOs ─────────────────────────────────────────────────────────────────

public record MemberOrganisatieDto(
    Guid   Id,
    Guid   MemberId,
    string Organisatie,
    string? Logboeknummer,
    string? BeginDatum,
    string  CreatedAt,
    string? UpdatedAt,
    IReadOnlyList<BrevetSummaryDto> Brevetten
);

public record CreateMemberOrganisatieDto(
    string  Organisatie,
    string? Logboeknummer,
    string? BeginDatum
);

public record UpdateMemberOrganisatieDto(
    string? Logboeknummer,
    string? BeginDatum
);
