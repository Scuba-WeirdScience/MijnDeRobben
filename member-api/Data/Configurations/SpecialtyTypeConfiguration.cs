using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class SpecialtyTypeConfiguration : IEntityTypeConfiguration<SpecialtyType>
{
    public void Configure(EntityTypeBuilder<SpecialtyType> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Organisatie).IsRequired().HasMaxLength(50);
        builder.Property(s => s.Naam).IsRequired().HasMaxLength(100);
        builder.Property(s => s.Volgorde).HasDefaultValue(0);

        builder.HasIndex(s => new { s.Organisatie, s.Naam }).IsUnique();

        builder.ToTable("SpecialtyTypes");
    }
}
