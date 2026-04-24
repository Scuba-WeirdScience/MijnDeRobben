using ApiGateway.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ApiGateway.Data;

public class GatewayDbContext(DbContextOptions<GatewayDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Rename Identity tables with cleaner names (optional)
        builder.Entity<ApplicationUser>().ToTable("Users");

        // Member-profile fields on ApplicationUser
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(u => u.FirstName).HasMaxLength(100).IsRequired(false);
            entity.Property(u => u.LastName).HasMaxLength(100).IsRequired(false);
            entity.Property(u => u.AvatarUrl).HasMaxLength(500).IsRequired(false);
        });
    }
}
