using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class MemberConfiguration : IEntityTypeConfiguration<Member>
{
    public void Configure(EntityTypeBuilder<Member> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.UserId).IsRequired().HasMaxLength(256);
        builder.HasIndex(m => m.UserId).IsUnique();
        builder.Property(m => m.FirstName).IsRequired().HasMaxLength(100);
        builder.Property(m => m.LastName).IsRequired().HasMaxLength(100);
        builder.Property(m => m.IsActive).HasDefaultValue(true);
        builder.Property(m => m.IsValidated).HasDefaultValue(false);
        builder.Property(m => m.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        builder.Property(m => m.AvatarUrl).HasMaxLength(500).IsRequired(false);
    }
}
