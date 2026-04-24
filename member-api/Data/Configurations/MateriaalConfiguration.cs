using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class MateriaalConfiguration : IEntityTypeConfiguration<Materiaal>
{
    public void Configure(EntityTypeBuilder<Materiaal> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Naam).IsRequired().HasMaxLength(100);
        builder.Property(m => m.Serienummer).HasMaxLength(100);
        builder.Property(m => m.Notities).HasMaxLength(500);
        builder.Property(m => m.Actief).HasDefaultValue(false);
        builder.Property(m => m.CustomProperties).HasColumnType("nvarchar(max)");
        builder.Property(m => m.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(m => m.MateriaalType)
               .WithMany()
               .HasForeignKey(m => m.MateriaalTypeId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
