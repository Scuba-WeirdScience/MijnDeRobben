namespace MemberApi.Models;

public class Member
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Links this member record to the ApplicationUser.Id in the gateway DB.</summary>
    public string UserId { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public DateOnly JoinDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public bool IsActive { get; set; } = true;
    public bool IsValidated { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Relative URL to the member's avatar image, e.g. /uploads/avatars/guid.jpg</summary>
    public string? AvatarUrl { get; set; }
}
