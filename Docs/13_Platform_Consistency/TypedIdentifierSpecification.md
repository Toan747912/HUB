# Typed Identifier Specification

**Batch:** WP-06C — Platform Standardization & Hardening  
**Status:** Canonical & Deployed  
**Owning Module:** `src/shared/domain/identifiers/`  

---

## 1. Context & Motivation

Historically, aggregate references (`goalId`, `roadmapId`, `assessmentId`, `recommendationId`, `learnerId`) were stored as primitive `string` types in the domain layer. As a result, positional parameter transposition (such as passing a `roadmapId` where a `goalId` was expected in `Recommendation`'s constructor) compiled without errors.

To eliminate this class of structural bugs, we introduced **strongly typed value objects** representing branded/opaque identifiers. These prevent different ID kinds from being assigned to one another at compile time, while compiling down to simple runtime strings.

---

## 2. Branded TypeScript Pattern

The core mechanism is defined in [identifier.base.ts](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/shared/domain/identifiers/identifier.base.ts) as an abstract class using a TypeScript **phantom field**:

```typescript
export abstract class Identifier<Brand extends string> {
  protected readonly value: string;

  // Phantom field: exists only for compile-time structural typing.
  // Never assigned at runtime.
  private readonly __brand!: Brand;

  protected constructor(value: string) {
    if (value === undefined || value === null || value.trim().length === 0) {
      throw new Error(
        `${new.target.name}: identifier value must be a non-empty string`,
      );
    }
    this.value = value;
  }

  public equals(other: Identifier<Brand> | undefined | null): boolean {
    if (other === undefined || other === null) return false;
    if (!(other instanceof Identifier)) return false;
    return other.value === this.value;
  }

  public toString(): string {
    return this.value;
  }

  public toJSON(): string {
    return this.value;
  }
}
```

### Concrete Subclasses
Concrete ID types inherit the base, defining their own string literal type parameter (the brand):
```typescript
export class GoalId extends Identifier<'Goal'> {
  public static create(value: string): GoalId {
    return new GoalId(value);
  }

  public static generate(): GoalId {
    return new GoalId(randomUUID());
  }
}
```

---

## 3. Platform Identifier Catalog

The platform standardizes the following identifiers under [src/shared/domain/identifiers/index.ts](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/shared/domain/identifiers/index.ts):

| Identifier Class | Brand | Format | Context / Target Entity |
|---|---|---|---|
| `GoalId` | `'Goal'` | UUID v4 | Goal Aggregate Root |
| `RoadmapId` | `'Roadmap'` | UUID v4 | Roadmap Aggregate Root |
| `AssessmentId` | `'Assessment'` | UUID v4 | Assessment Aggregate Root |
| `RecommendationId` | `'Recommendation'` | UUID v4 | Recommendation Aggregate Root |
| `LearnerId` | `'Learner'` | UUID v4 / Auth User ID | Identity Reference (External) |
| `SkillId` | `'Skill'` | UUID v4 | Skill Catalog Aggregate Root |
| `TaskId` | `'Task'` | UUID/Arbitrary string | Roadmap Task Entity |
| `MilestoneId` | `'Milestone'` | UUID/Arbitrary string | Goal/Roadmap Milestone Entity |
| `PhaseId` | `'Phase'` | UUID/Arbitrary string | Roadmap Phase Entity |

---

## 4. Boundary Mapping & Serialization Rules

To keep database schemas backward-compatible and prevent performance issues in high-frequency string interpolation, typed identifiers are localized to the **domain layer** and mapped at the boundaries:

```
           [ HTTP Request (String ID) ]
                        │
                        ▼  (Controller / DTO validation)
      [ App Command / Domain Layer (Typed ID) ]
                        │
                        ▼  (Repository Persistence Mapper)
          [ MongoDB Schema (String ID) ]
```

### 1. Interface Boundary
- **Input:** Controller endpoints receive raw parameter and body strings. DTOs validate formatting using standard string rules (e.g. `@IsUUID()`).
- **Domain Entry:** Inside application commands or handlers, values are wrapped immediately using `.create(rawString)`.

### 2. Persistence Boundary
- **MongoDB Documents:** Mongoose schemas define identifier fields as `{ type: String }`.
- **Repository Mappers:** Persistence mappers convert between documents and aggregates:
  - *Retrieval:* Maps document string fields back to typed identifiers (e.g. `GoalId.create(doc.goalId)`).
  - *Save:* Converts typed identifiers to strings using `.toString()` or implicit casting during mapping.

### 3. Serialization Semantics
- **JSON Serialization:** Override `.toJSON()` to return the plain wrapped string. NestJS controllers automatically serialize response objects back to standard JSON without leaving class objects in output payloads.
- **Event Payloads:** For outbox events, IDs are serialized to standard string values in payloads:
  ```typescript
  payload: {
    goalId: event.metadata.aggregateId.toString()
  }
  ```
- **Engine Exception:** Heavy algorithmic engines (e.g. `roadmap-planning.engine.ts`, `assessment.engine.ts`, `recommendation.engine.ts`) use raw strings instead of typed identifiers because JavaScript Map keys evaluate equality by object reference, which breaks when looking up key records (e.g., `bySkill.get(task.skillId)`).
