namespace MemberApi.Models;

public class MemberOrganisatie
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid MemberId { get; set; }
    public Member Member { get; set; } = null!;

    /// <summary>
    /// Organisation code: CMAS | PADI | SSI | NELOS | NOB
    /// (Anders is excluded — no logbook number applicable)
    /// </summary>
    public string Organisatie { get; set; } = string.Empty;

    /// <summary>The member's logbook/member number within this organisation.</summary>
    public string? Logboeknummer { get; set; }

    /// <summary>Optional date when the member joined / registered with this organisation.</summary>
    public DateOnly? BeginDatum { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
