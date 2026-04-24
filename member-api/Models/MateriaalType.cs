namespace MemberApi.Models;

public class MateriaalType
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Type name, e.g. "Duikfles", "Regulator", "BCD".</summary>
    public string Naam { get; set; } = string.Empty;

    /// <summary>Optional description of this type of equipment.</summary>
    public string? Beschrijving { get; set; }

    /// <summary>Sort order in lists.</summary>
    public int Volgorde { get; set; } = 0;

    /// <summary>Max loans per member for this type. Null = unlimited.</summary>
    public int? MaxLeningenPerLid { get; set; }

    /// <summary>Huurprijs per dag/gebruik in euro. Null = gratis.</summary>
    public decimal? Huurprijs { get; set; }

    /// <summary>
    /// Dynamic field definitions for this type.
    /// Stored as JSON array, e.g.: [{ "key": "Inhoud", "label": "Inhoud (L)" }, { "key": "Werkdruk", "label": "Werkdruk (bar)" }]
    /// </summary>
    public string? CustomProperties { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Child materialen items.</summary>
    public ICollection<Materiaal> Materialen { get; set; } = new List<Materiaal>();
}
