using Apps.Backend.Modules.Intervention.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class InterventionConfiguration : IEntityTypeConfiguration<InterventionRecord>
{
    public void Configure(EntityTypeBuilder<InterventionRecord> builder)
    {
        builder.ToTable("intervention_record");

        builder.HasKey(x => x.InterventionId);

        builder.Property(x => x.InterventionId)
            .HasColumnName("intervention_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id")
            .IsRequired();

        builder.Property(x => x.RecommendationProposalId)
            .HasColumnName("recommendation_proposal_id")
            .IsRequired();

        builder.Property(x => x.LearningSessionId)
            .HasColumnName("learning_session_id")
            .IsRequired();

        builder.Property(x => x.ActionType)
            .HasColumnName("action_type")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.Message)
            .HasColumnName("message")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(x => new { x.LearnerId, x.LearningSessionId });
    }
}
