namespace MemberApi.Models;

public class Materiaal
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MateriaalTypeId { get; set; }
    public MateriaalType MateriaalType { get; set; } = null!;

    /// <summary>Item name, e.g. "Duikfles #3", "Regulator Set A".</summary>
    public string Naam { get; set; } = string.Empty;

    /// <summary>Optional serial number.</summary>
    public string? Serienummer { get; set; }

    /// <summary>Notes, condition observations, etc.</summary>
    public string? Notities { get; set; }

    /// <summary>Date of purchase.</summary>
    public DateOnly? AankoopDatum { get; set; }

    /// <summary>True if this material is currently on loan.</summary>
    public bool Actief { get; set; } = false;

    /// <summary>
    /// Dynamic property values for this item, keyed by the field keys defined in the parent MateriaalType.
    /// Stored as JSON object, e.g.: { "Inhoud": "15L", "Werkdruk": "200 bar" }
    /// </summary>
    public string? CustomProperties { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
