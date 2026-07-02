# Backend TODO

## Phase 2 Implementation Plan

- [x] Verify DecisionTrace repository interface existence (no new contracts)
- [x] Add EF repository implementations for all existing module repository interfaces
- [x] Clean Program.cs persistence registrations and mode switch
- [x] Wire PostgreSQL connection settings in appsettings files
- [x] Verify DI registrations are non-duplicated and consistent
- [x] Mark Phase 2 status after implementation is actually complete

## Phase 2 Progress

- [x] Reviewed current Program.cs and identified duplicate/ambiguous persistence registrations
- [x] Reviewed existing repository interfaces and in-memory implementations
- [x] Removed premature completion status
- [x] Implemented EF repositories for Knowledge, Evidence, Assessment, Recommendation, Intervention
- [x] Updated Program.cs to switch cleanly between InMemory and EfCore repository registrations
- [x] Updated appsettings and appsettings.Development for Persistence.Mode and PostgreSQL connection string key
- [x] Completed static DI review for repository registration clarity

## Phase 2 Status

PHASE 2 IMPLEMENTATION COMPLETE – RUNTIME VALIDATION PENDING
