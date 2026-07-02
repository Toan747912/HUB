using Apps.Backend.Modules.Assessment.Domain;
using Apps.Backend.Modules.Evidence.Domain;
using Apps.Backend.Modules.Intervention.Domain;
using Apps.Backend.Modules.Knowledge.Domain;
using Apps.Backend.Modules.Recommendation.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Infrastructure.Persistence.EfCore;

public sealed class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<KnowledgeNode> KnowledgeNodes => Set<KnowledgeNode>();
    public DbSet<KnowledgeEdge> KnowledgeEdges => Set<KnowledgeEdge>();
    public DbSet<KnowledgeNodeMastery> KnowledgeNodeMasteries => Set<KnowledgeNodeMastery>();
    public DbSet<EvidenceRecord> Evidences => Set<EvidenceRecord>();
    public DbSet<EvidenceLink> EvidenceLinks => Set<EvidenceLink>();
    public DbSet<AssessmentResultRecord> AssessmentResults => Set<AssessmentResultRecord>();
    public DbSet<RecommendationProposalRecord> RecommendationProposals => Set<RecommendationProposalRecord>();
    public DbSet<InterventionRecord> Interventions => Set<InterventionRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
