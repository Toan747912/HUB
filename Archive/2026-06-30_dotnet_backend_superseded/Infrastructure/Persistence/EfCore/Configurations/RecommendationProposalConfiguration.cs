using Apps.Backend.Modules.Recommendation.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class RecommendationProposalConfiguration : IEntityTypeConfiguration<RecommendationProposalRecord>
{
    public void Configure(EntityTypeBuilder<RecommendationProposalRecord> builder)
    {
        builder.ToTable("recommendation_proposal");

        builder.HasKey(x => x.RecommendationProposalId);

        builder.Property(x => x.RecommendationProposalId)
            .HasColumnName("recommendation_proposal_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id")
            .IsRequired();

        builder.Property(x => x.LearningSessionId)
            .HasColumnName("learning_session_id")
            .IsRequired();

        builder.Property(x => x.RecommendationType)
            .HasColumnName("recommendation_type")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.Message)
            .HasColumnName("message")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(x => x.KnowledgeNodeIds)
            .HasColumnName("knowledge_node_ids")
            .HasConversion(
                v => string.Join(',', v),
                v => string.IsNullOrWhiteSpace(v)
                    ? new List<Guid>()
                    : v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(Guid.Parse).ToList())
            .HasColumnType("text")
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(x => new { x.LearnerId, x.LearningSessionId });
    }
}
