using Apps.Backend.Modules.Assessment.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class AssessmentResultConfiguration : IEntityTypeConfiguration<AssessmentResultRecord>
{
    public void Configure(EntityTypeBuilder<AssessmentResultRecord> builder)
    {
        builder.ToTable("assessment_result");

        builder.HasKey(x => x.AssessmentResultId);

        builder.Property(x => x.AssessmentResultId)
            .HasColumnName("assessment_result_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id")
            .IsRequired();

        builder.Property(x => x.LearningSessionId)
            .HasColumnName("learning_session_id")
            .IsRequired();

        builder.Property(x => x.Score)
            .HasColumnName("score")
            .HasPrecision(5, 4)
            .IsRequired();

        builder.Property(x => x.Level)
            .HasColumnName("level")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.Summary)
            .HasColumnName("summary")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(x => new { x.LearnerId, x.LearningSessionId });
    }
}
