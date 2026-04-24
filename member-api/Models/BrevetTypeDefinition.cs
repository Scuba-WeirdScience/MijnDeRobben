namespace MemberApi.Models;

public class BrevetTypeDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Organisation code: CMAS | PADI | SSI | NELOS | NOB | Anders</summary>
    public string Organisatie { get; set; } = string.Empty;

    /// <summary>Brevet type name, e.g. "Open Water", "Niveau 2*".</summary>
    public string Naam { get; set; } = string.Empty;

    /// <summary>Sort order within the organisation.</summary>
    public int Volgorde { get; set; } = 0;
}
