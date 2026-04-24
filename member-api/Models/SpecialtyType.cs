namespace MemberApi.Models;

public class SpecialtyType
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Organisation code: CMAS | PADI | SSI | NELOS | NOB | Anders</summary>
    public string Organisatie { get; set; } = string.Empty;

    /// <summary>Specialty name, e.g. "Nitrox", "Wrak".</summary>
    public string Naam { get; set; } = string.Empty;

    /// <summary>Sort order within the organisation.</summary>
    public int Volgorde { get; set; } = 0;
}
