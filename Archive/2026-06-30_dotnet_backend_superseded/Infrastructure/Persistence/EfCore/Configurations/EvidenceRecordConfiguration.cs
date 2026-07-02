using Apps.Backend.Modules.Evidence.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Apps.Backend.Infrastructure.Persistence.EfCore.Configurations;

public sealed class EvidenceRecordConfiguration : IEntityTypeConfiguration<EvidenceRecord>
{
    public void Configure(EntityTypeBuilder<EvidenceRecord> builder)
    {
        builder.ToTable("evidence");

        builder.HasKey(x => x.EvidenceId);

        builder.Property(x => x.EvidenceId)
            .HasColumnName("evidence_id");

        builder.Property(x => x.LearnerId)
            .HasColumnName("learner_id")
            .IsRequired();

        builder.Property(x => x.LearningSessionId)
            .HasColumnName("learning_session_id")
            .IsRequired();

        builder.Property(x => x.EvidenceType)
            .HasColumnName("evidence_type")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.Payload)
            .HasColumnName("payload")
            .HasColumnType("text")
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.HasIndex(x => new { x.LearnerId, x.LearningSessionId });
    }
}
