namespace MemberApi.DTOs;

// ── Custom property definition (stored as JSON on MateriaalType) ────────────────

/// <summary>Defines a single dynamic text field for a MateriaalType.</summary>
public record CustomPropertyDef(
    /// <summary>Unique key used to store/retrieve the value, e.g. "Inhoud".</summary>
    string Key,
    /// <summary>Human-readable label shown in forms/tables, e.g. "Inhoud (L)".</summary>
    string Label
);

// ── MateriaalType ────────────────────────────────────────────────────────────────

public record MateriaalTypeDto(
    Guid Id,
    string Naam,
    string? Beschrijving,
    int Volgorde,
    int? MaxLeningenPerLid,
    decimal? Huurprijs,
    /// <summary>JSON array of CustomPropertyDef objects defining the dynamic fields for this type.</summary>
    IReadOnlyList<CustomPropertyDef>? CustomProperties,
    string CreatedAt,
    string? UpdatedAt
);

public record CreateMateriaalTypeDto(
    string Naam,
    string? Beschrijving,
    int? Volgorde,
    int? MaxLeningenPerLid,
    decimal? Huurprijs,
    /// <summary>JSON array of CustomPropertyDef objects.</summary>
    IReadOnlyList<CustomPropertyDef>? CustomProperties
);

public record UpdateMateriaalTypeDto(
    string? Naam,
    string? Beschrijving,
    int? Volgorde,
    int? MaxLeningenPerLid,
    decimal? Huurprijs,
    /// <summary>JSON array of CustomPropertyDef objects.</summary>
    IReadOnlyList<CustomPropertyDef>? CustomProperties
);

// ── Materiaal ──────────────────────────────────────────────────────────────────

public record MateriaalDto(
    Guid Id,
    Guid MateriaalTypeId,
    string Naam,
    string? Serienummer,
    string? Notities,
    string? AankoopDatum,
    /// <summary>True if this item is currently on loan (an open lening with no return date).</summary>
    bool Actief,
    /// <summary>JSON object with dynamic property values, keyed by the CustomPropertyDef keys.</summary>
    Dictionary<string, string>? CustomProperties,
    string CreatedAt,
    string? UpdatedAt
);

public record CreateMateriaalDto(
    Guid MateriaalTypeId,
    string Naam,
    string? Serienummer,
    string? Notities,
    string? AankoopDatum,
    /// <summary>JSON object with dynamic property values.</summary>
    Dictionary<string, string>? CustomProperties
);

public record UpdateMateriaalDto(
    string? Naam,
    string? Serienummer,
    string? Notities,
    string? AankoopDatum,
    /// <summary>JSON object with dynamic property values.</summary>
    Dictionary<string, string>? CustomProperties
);

// ── Grouped view (type with its materialen) ───────────────────────────────────

public record MateriaalTypeWithMaterialenDto(
    Guid Id,
    string Naam,
    string? Beschrijving,
    int Volgorde,
    int? MaxLeningenPerLid,
    decimal? Huurprijs,
    /// <summary>Field definitions for this type.</summary>
    IReadOnlyList<CustomPropertyDef>? CustomProperties,
    IReadOnlyList<MateriaalDto> Materialen,
    string CreatedAt,
    string? UpdatedAt
);
