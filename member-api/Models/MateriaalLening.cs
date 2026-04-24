namespace MemberApi.Models;

public class MateriaalLening
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MateriaalId { get; set; }
    public Materiaal Materiaal { get; set; } = null!;
    public Guid MemberId { get; set; }
    public DateOnly UitgeleendDatum { get; set; }
    public DateOnly? Retourdatum { get; set; }
    public string? Notities { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
