# Goal Dependency Analysis (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Objective:** Define strict allowed and forbidden dependencies for Goal module

---

## 1. Dependency Philosophy

Goal is an upstream domain for goal state authority.
It must remain independent from downstream business execution modules.

Dependency direction must preserve:
- ownership integrity,
- aggregate integrity,
- modular evolution safety.

---

## 2. Allowed Dependencies (Mandatory)

## 2.1 Goal -> Shared
Allowed for:
- cross-cutting primitives (time, identity, error base types)
- boundary guards
- tracing/correlation abstractions

## 2.2 Goal -> Event Bus
Allowed for:
- publishing Goal domain events
- subscribing to infrastructure-level delivery acknowledgements (if needed, non-domain)

---

## 3. Forbidden Dependencies (Mandatory)

Direct dependencies from Goal module to:

- Goal -> Roadmap
- Goal -> Assessment
- Goal -> Recommendation
- Goal -> Teaching
- Goal -> Learning Session
- Goal -> AI Runtime

Rationale:
- those modules are downstream consumers or peer bounded contexts.
- direct coupling would violate clean boundaries and write-owner authority model.

---

## 4. Layered Dependency Rules (Clean Architecture)

Inside Goal module:

1. `domain` depends on nothing outward except pure shared primitives.
2. `application` may depend on `domain` and abstractions.
3. `infrastructure` depends inward on `application/domain` contracts.
4. `interface` depends on `application` contracts only.
5. `orchestration` coordinates application flows without bypassing domain.

Forbidden internal anti-patterns:
- domain importing infrastructure concerns
- interface writing directly to persistence
- orchestration mutating state outside application/domain contracts

---

## 5. Cross-Module Interaction Model

Goal interacts with other modules only via:

1. **Published Events** (Goal -> others, asynchronous)
2. **Read Access** (others -> Goal projections/contracts)
3. **Command Requests** (others/clients request Goal change through Goal API boundary, not direct write)

---

## 6. Risk Analysis for Dependency Violations

If forbidden dependencies are introduced, risks include:

- hidden bidirectional coupling
- broken module autonomy
- cascading release coupling
- ownership boundary erosion
- eventual data inconsistency from direct writes

Severity:
- direct Goal write bypass = Critical
- compile-time forbidden import = High
- implicit runtime cross-call without contract = High

---

## 7. Governance Controls

Recommended controls to enforce dependency policy:

1. static dependency rule checks
2. architecture fitness tests
3. module import allowlist/denylist
4. boundary guard policies in runtime layer
5. audit checklist in readiness review gate

---

## 8. Decision Summary

Goal module remains implementation-ready only if:
- all allowed dependencies are respected,
- all forbidden dependencies are absent,
- event-based coordination is used for cross-domain workflows.
