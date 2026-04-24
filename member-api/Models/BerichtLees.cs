namespace MemberApi.Models;

/// <summary>Tracks which members have read which berichten.</summary>
public class BerichtLees
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid BerichtId { get; set; }
    public Bericht Bericht { get; set; } = null!;

    /// <summary>FK to Members.Id — the member who read this bericht.</summary>
    public Guid LezerId { get; set; }
    public Member Lezer { get; set; } = null!;

    public DateTime GelezenOp { get; set; } = DateTime.UtcNow;
}
