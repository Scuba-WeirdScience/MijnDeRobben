using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class MateriaalLeningConfiguration : IEntityTypeConfiguration<MateriaalLening>
{
    public void Configure(EntityTypeBuilder<MateriaalLening> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.UitgeleendDatum).IsRequired();
        builder.Property(x => x.Retourdatum);
        builder.Property(x => x.Notities).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(x => x.Materiaal)
            .WithMany()
            .HasForeignKey(x => x.MateriaalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.MemberId);
        builder.HasIndex(x => new { x.MateriaalId, x.Retourdatum });
    }
}
