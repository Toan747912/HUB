using System.Text;
using Apps.Backend.Infrastructure.Configuration;
using Apps.Backend.Infrastructure.Middleware;
using Apps.Backend.Infrastructure.Persistence;
using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Assessment.Application;
using Apps.Backend.Modules.Assessment.Infrastructure;
using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Evidence.Infrastructure;
using Apps.Backend.Modules.Identity.Application;
using Apps.Backend.Modules.Identity.Infrastructure;
using Apps.Backend.Modules.Intervention.Application;
using Apps.Backend.Modules.Intervention.Infrastructure;
using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Infrastructure;
using Apps.Backend.Modules.Recommendation.Application;
using Apps.Backend.Modules.Recommendation.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var persistenceOptions = new PersistenceOptions();
builder.Configuration.GetSection(PersistenceOptions.SectionName).Bind(persistenceOptions);
var persistenceMode = persistenceOptions.GetModeOrDefault();

builder.Services.Configure<PersistenceOptions>(
    builder.Configuration.GetSection(PersistenceOptions.SectionName));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddSingleton<SupabaseSettingsReader>();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddScoped<IKnowledgeService, KnowledgeService>();
builder.Services.AddScoped<IEvidenceService, EvidenceService>();
builder.Services.AddScoped<IAssessmentService, AssessmentService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IInterventionService, InterventionService>();

if (persistenceMode == PersistenceMode.InMemory)
{
    builder.Services.AddSingleton<IKnowledgeNodeRepository, InMemoryKnowledgeNodeRepository>();
    builder.Services.AddSingleton<IKnowledgeEdgeRepository, InMemoryKnowledgeEdgeRepository>();
    builder.Services.AddSingleton<IKnowledgeNodeMasteryRepository, InMemoryKnowledgeNodeMasteryRepository>();
    builder.Services.AddSingleton<IEvidenceRepository, InMemoryEvidenceRepository>();
    builder.Services.AddSingleton<IEvidenceLinkRepository, InMemoryEvidenceLinkRepository>();
    builder.Services.AddSingleton<IAssessmentResultRepository, InMemoryAssessmentResultRepository>();
    builder.Services.AddSingleton<ISessionOwnershipChecker, InMemorySessionOwnershipChecker>();
    builder.Services.AddSingleton<IRecommendationRepository, InMemoryRecommendationRepository>();
    builder.Services.AddSingleton<IInterventionRepository, InMemoryInterventionRepository>();
    builder.Services.AddSingleton<IUnitOfWork, NoOpUnitOfWork>();
}
else
{
    var connectionString = builder.Configuration.GetConnectionString("PostgreSQL");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("Connection string 'PostgreSQL' is required for EfCore persistence mode.");
    }

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseNpgsql(connectionString));

    builder.Services.AddScoped<IKnowledgeNodeRepository, EfCoreKnowledgeNodeRepository>();
    builder.Services.AddScoped<IKnowledgeEdgeRepository, EfCoreKnowledgeEdgeRepository>();
    builder.Services.AddScoped<IKnowledgeNodeMasteryRepository, EfCoreKnowledgeNodeMasteryRepository>();
    builder.Services.AddScoped<IEvidenceRepository, EfCoreEvidenceRepository>();
    builder.Services.AddScoped<IEvidenceLinkRepository, EfCoreEvidenceLinkRepository>();
    builder.Services.AddScoped<IAssessmentResultRepository, EfCoreAssessmentResultRepository>();
    builder.Services.AddSingleton<ISessionOwnershipChecker, InMemorySessionOwnershipChecker>();
    builder.Services.AddScoped<IRecommendationRepository, EfCoreRecommendationRepository>();
    builder.Services.AddScoped<IInterventionRepository, EfCoreInterventionRepository>();
    builder.Services.AddScoped<IUnitOfWork, EfCoreUnitOfWork>();
}

var jwtIssuer = builder.Configuration["Authentication:Jwt:Issuer"];
var jwtAudience = builder.Configuration["Authentication:Jwt:Audience"];
var jwtSigningKey = builder.Configuration["Authentication:Jwt:SigningKey"];
var jwtExpirationMinutes = builder.Configuration["Authentication:Jwt:AccessTokenExpirationMinutes"];

if (string.IsNullOrWhiteSpace(jwtIssuer) ||
    string.IsNullOrWhiteSpace(jwtAudience) ||
    string.IsNullOrWhiteSpace(jwtSigningKey) ||
    string.IsNullOrWhiteSpace(jwtExpirationMinutes) ||
    !int.TryParse(jwtExpirationMinutes, out var parsedExpirationMinutes) ||
    parsedExpirationMinutes <= 0)
{
    throw new InvalidOperationException(
        "Invalid JWT configuration. Ensure Issuer, Audience, SigningKey, and AccessTokenExpirationMinutes are configured correctly.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey ?? string.Empty)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
