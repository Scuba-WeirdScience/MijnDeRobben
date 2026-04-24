using Microsoft.AspNetCore.Identity;

namespace ApiGateway.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public DateOnly JoinDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public bool IsActive { get; set; } = true;
    public bool IsValidated { get; set; } = false;

    /// <summary>Relative URL to the member's avatar image, e.g. /uploads/avatars/guid.jpg</summary>
    public string? AvatarUrl { get; set; }
}
