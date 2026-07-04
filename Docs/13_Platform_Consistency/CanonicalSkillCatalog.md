# Canonical Skill Catalog

**Batch:** WP-06C — Platform Standardization & Hardening  
**Status:** Canonical & Deployed  
**Owning Module:** `src/modules/skill/`  

---

## 1. Domain Modeling & Structure

The platform-wide `Skill` catalog establishes a centralized entity to reference individual skills, replacing ad hoc free-text fields. It is a lookup registry rather than a stateful workflow aggregate, meaning it does not have a lifecycle (no draft/published/archived states).

### Skill Aggregate Structure
Each Skill contains:
- **`skillId: SkillId`:** The canonical, strongly typed UUID wrapper.
- **`name: string`:** The human-readable display name of the skill (e.g., "Advanced Practice").
- **`normalizedName: string`:** Trimmed, lowercase version of the name, used as the primary uniqueness key.
- **`category: SkillCategory`:** Consolidated categorization enum supporting:
  - `TECHNICAL`
  - `CONCEPTUAL`
  - `PRACTICAL`
  - `OTHER`
- **`parentSkillId: SkillId | null`:** Hierarchical reference to build parent-child taxonomies.
- **`aliases: string[]`:** Alternative names (e.g. "Solid" might alias "SOLID Principles").
- **`metadata: Record<string, unknown>`:** Extensible key-value dictionary for external node properties.

---

## 2. Uniqueness & Catalog Resolution

To maintain catalog integrity and prevent race-condition duplicates during parallel writes:
1. **Normalized Uniqueness:** A unique compound index is defined on `normalizedName` in the Mongoose schema:
   ```typescript
   SkillSchema.index({ normalizedName: 1 }, { unique: true });
   ```
2. **Deduplicated Lookup:** The only way to retrieve/insert skills is via [SkillCatalogService.findOrCreateByName()](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/modules/skill/application/services/skill-catalog.service.ts):
   - Trims and lowercases the input string to form the `normalizedName`.
   - Queries the database using the normalized string.
   - If a record is found, returns it; otherwise, creates, persists, and returns a new `Skill` with a fresh `SkillId`.

---

## 3. Migration Plan & History

A one-time migration script [migrate-skill-areas.script.ts](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/modules/skill/scripts/migrate-skill-areas.script.ts) mapped all pre-existing `skillArea` free-text strings from test fixtures into canonical catalog entries.

### Resolved Mappings (`skillArea` → `SkillId`)
During the migration, 9 distinct `skillArea` strings were resolved:

| Old `skillArea` Value | Generated `SkillId` | Category |
|---|---|---|
| `Solid` | `46a96912-26c3-4d44-a0a3-ce229cfad415` | `OTHER` |
| `Weak` | `4daadeae-e0f0-4fef-86a6-c4f30c9c2bc6` | `OTHER` |
| `Foundations` | `09939e06-1805-4ce9-be18-254a3ffe1db1` | `OTHER` |
| `Advanced Practice` | `2195736e-fc68-4431-b175-d0252df74355` | `OTHER` |
| `Weak Area` | `edbd148e-f966-4486-84d8-f6061854cef5` | `OTHER` |
| `Strong Area` | `d133d336-044d-486f-aed8-e49f20d865cc` | `OTHER` |
| `A` | `4b311abe-3ffd-44ce-b5bd-38ab8a39925e` | `OTHER` |
| `B` | `b2f85c49-d212-4c9f-ba65-728cc88fea57` | `OTHER` |
| `X` | `2b9b76f4-7645-4e49-8e57-24f665a9190e` | `OTHER` |

*Note: Generating a catalog in a new environment will assign new UUIDs, but lookups will map to the same records based on name normalization.*

### Unresolved / Excluded Sentinels
- **`__roadmap__`**: This is a sentinel string used by `recommendation.engine.ts` to denote roadmap-level recommendations rather than specific skills. It is explicitly filtered out of the migration and does not map to any catalog entry.

---

## 4. Cross-Module Reference Integrity

All modules interacting with skills have been standardized to reference `SkillId`:
- **Roadmap Module:** Emits tasks referencing `skillId: string`.
- **Assessment Module:** Entities like `Competency`, `KnowledgeGap`, and `SkillScore` hold a strongly typed `SkillId`.
- **Recommendation Module:** `RecommendationItem` and `LearningStrategyAssignment` aggregates hold a strongly typed `SkillId`.
- **Computation Boundary Rule:** Computation engines (`assessment.engine.ts`, `recommendation.engine.ts`) use raw strings (`SkillId.toString()`) to act as Map keys and support safe template interpolations. The typed `SkillId` sits at the aggregate boundaries that wrap engine inputs and outputs.
