namespace MemberApi.Models;

public class Brevet
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MemberId { get; set; }
    public Member Member { get; set; } = null!;

    /// <summary>
    /// Organisation code: CMAS | PADI | SSI | NELOS | NOB | Anders
    /// </summary>
    public string Organisatie { get; set; } = string.Empty;

    /// <summary>Only filled in when Organisatie == "Anders".</summary>
    public string? OrganisatieNaam { get; set; }

    /// <summary>"Brevet" or "Specialiteit".</summary>
    public string BrevetType { get; set; } = "Brevet";

    /// <summary>Level within the organisation, e.g. "1-ster", "Open Water".</summary>
    public string Niveau { get; set; } = string.Empty;

    public DateOnly? BehaaldDatum { get; set; }

    public string? Notities { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

}
