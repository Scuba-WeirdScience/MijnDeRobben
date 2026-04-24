namespace MemberApi.Models;

public class Bericht
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>FK to Members.Id — the author of this message.</summary>
    public Guid ZenderId { get; set; }
    public Member Zender { get; set; } = null!;

    public string Onderwerp { get; set; } = string.Empty;
    public string Inhoud { get; set; } = string.Empty;

    public bool IsPinned { get; set; } = false;

    public DateTime AangemaaktOp { get; set; } = DateTime.UtcNow;
    public DateTime? BijgewerktOp { get; set; }

    public ICollection<BerichtLees> Lezingen { get; set; } = [];
}
