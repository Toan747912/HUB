# Goal Ownership Matrix (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Principle:** Goal Module is write owner for goal-related state

---

## 1. Ownership Matrix (Mandatory)

| Module | Read | Write |
|---|---|---|
| Goal | ✅ | ✅ |
| Roadmap | ✅ | ❌ |
| Assessment | ✅ | ❌ |
| Recommendation | ✅ | ❌ |
| Learning Session | ✅ | ❌ |
| Teaching | ✅ | ❌ |

Interpretation:
- All listed modules may read Goal data via approved contracts/projections.
- Only Goal module can execute state mutations.

---

## 2. Write-Owned Entities

Goal module has exclusive write ownership of:

- Goal
- GoalVersion
- GoalProgress
- GoalConstraint
- GoalMilestone

No external module may write to these entities directly.

---

## 3. Forbidden Direct Writes (Mandatory)

Forbidden operations from non-Goal modules include:

1. Updating Goal lifecycle state directly.
2. Appending/updating GoalVersion directly.
3. Writing GoalProgress directly.
4. Mutating GoalConstraint directly.
5. Marking GoalMilestone reached directly.
6. Performing bulk patch/update on Goal storage outside Goal application boundary.

Violation classification:
- `OWNERSHIP_BOUNDARY_VIOLATION`

---

## 4. Allowed Interaction Patterns

External modules may:

1. Read Goal snapshots/history for their own decisions.
2. React to Goal domain events asynchronously.
3. Request Goal changes through public Goal commands/API boundary (never direct persistence mutation).

---

## 5. Ownership Enforcement Strategies (Design-Level)

1. **API Boundary Enforcement**
   - Only Goal interface exposes write commands.
2. **Application Service Gatekeeping**
   - Command authorization + domain policy checks before mutation.
3. **Domain Boundary Guard**
   - Runtime policy to reject foreign mutation paths.
4. **Event-Driven Coordination**
   - Other modules consume Goal events instead of issuing direct writes.

---

## 6. Cross-Module Behavior Rules

- Roadmap can reference Goal/GoalVersion (read), but cannot alter them.
- Assessment can read goal context for evaluation, but cannot complete/archive goals directly.
- Recommendation can propose changes, but Goal module remains decision executor.
- Learning Session can synchronize own lifecycle from Goal events, but cannot mutate goal states.
- Teaching can adapt pedagogy from goal context read models, but cannot write Goal data.

---

## 7. Governance Summary

Ownership integrity is preserved when:
- all writes enter via Goal commands,
- all state transitions occur inside Goal aggregate,
- all cross-domain updates use event-driven read-model propagation.

Any architecture that bypasses these rules is non-compliant for WP-06.
