using Apps.Backend.Modules.Knowledge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class KnowledgeNodeMasteryConfiguration : IEntityTypeConfiguration<KnowledgeNodeMastery>
{
    public void Configure(EntityTypeBuilder<KnowledgeNodeMastery> builder)
    {
        builder.ToTable("knowledge_node_mastery");

        builder.HasKey(x => x.KnowledgeNodeMasteryId);

        builder.Property(x => x.KnowledgeNodeMasteryId)
            .HasColumnName("knowledge_node_mastery_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id")
            .IsRequired();

        builder.Property(x => x.KnowledgeNodeId)
            .HasColumnName("knowledge_node_id")
            .IsRequired();

        builder.Property(x => x.MasteryScore)
            .HasColumnName("mastery_score")
            .HasPrecision(5, 4)
            .IsRequired();

        builder.Property(x => x.RecordedAtUtc)
            .HasColumnName("recorded_at_utc")
            .IsRequired();

        builder.HasIndex(x => new { x.LearnerId, x.KnowledgeNodeId });
    }
}
