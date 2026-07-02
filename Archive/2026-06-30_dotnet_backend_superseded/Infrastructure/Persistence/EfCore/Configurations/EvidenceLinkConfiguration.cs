using Apps.Backend.Modules.Evidence.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class EvidenceLinkConfiguration : IEntityTypeConfiguration<EvidenceLink>
{
    public void Configure(EntityTypeBuilder<EvidenceLink> builder)
    {
        builder.ToTable("evidence_link");

        builder.HasKey(x => x.EvidenceLinkId);

        builder.Property(x => x.EvidenceLinkId)
            .HasColumnName("evidence_link_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id")
            .IsRequired();

        builder.Property(x => x.EvidenceId)
            .HasColumnName("evidence_id")
            .IsRequired();

        builder.Property(x => x.KnowledgeNodeId)
            .HasColumnName("knowledge_node_id")
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(x => x.EvidenceId);
        builder.HasIndex(x => new { x.LearnerId, x.EvidenceId });
    }
}
