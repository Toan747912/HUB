using Apps.Backend.Modules.Knowledge.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class KnowledgeEdgeConfiguration : IEntityTypeConfiguration<KnowledgeEdge>
{
    public void Configure(EntityTypeBuilder<KnowledgeEdge> builder)
    {
        builder.ToTable("knowledge_edge");

        builder.HasKey(x => x.KnowledgeEdgeId);

        builder.Property(x => x.KnowledgeEdgeId)
            .HasColumnName("knowledge_edge_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id");

        builder.Property(x => x.FromKnowledgeNodeId)
            .HasColumnName("from_knowledge_node_id")
            .IsRequired();

        builder.Property(x => x.ToKnowledgeNodeId)
            .HasColumnName("to_knowledge_node_id")
            .IsRequired();

        builder.Property(x => x.RelationType)
            .HasColumnName("relation_type")
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(x => new { x.FromKnowledgeNodeId, x.ToKnowledgeNodeId, x.RelationType })
            .IsUnique();
    }
}
