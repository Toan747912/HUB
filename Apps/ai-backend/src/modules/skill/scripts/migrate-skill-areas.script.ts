/**
 * One-time migration helper for WP-06C Workstream B.
 *
 * Historically `skillArea` was free-text `string` threaded through the
 * Assessment and Recommendation modules with no canonical owner. Phase 5
 * introduced the Skill catalog (`SkillCatalogService`) and retyped the
 * domain-entity boundary to `SkillId`. This script is the one-time backfill
 * that turns every distinct `skillArea` string value that existed in the
 * codebase (test fixtures / seed data, since there was no production data
 * store for skillArea prior to this change) into a canonical catalog entry.
 *
 * Usage (from a NestJS application context with SkillModule available):
 *
 *   const skillCatalogService = app.get(SkillCatalogService);
 *   const result = await migrateSkillAreas(skillCatalogService, KNOWN_SKILL_AREA_VALUES);
 *
 * `result.resolved` maps each distinct skillArea value to the SkillId of the
 * catalog entry that now canonically owns it. `result.unresolved` lists any
 * values that were intentionally excluded (see SENTINEL_VALUES below).
 */
import { SkillCatalogService } from '../application/services/skill-catalog.service';

/**
 * Distinct `skillArea` string literals found across assessment/recommendation
 * test fixtures and engine seed data as of WP-06C Phase 5 (collected via
 * `git diff` over the skillArea -> skillId rename commit). There is no
 * production seed data source for skillArea; test fixtures are the only
 * place these values existed.
 */
export const KNOWN_SKILL_AREA_VALUES: string[] = [
  'Solid',
  'Weak',
  'Foundations',
  'Advanced Practice',
  'Weak Area',
  'Strong Area',
  'A',
  'B',
  'X',
  // Included here (rather than only in SENTINEL_VALUES) so that running this
  // script against the full inventory demonstrates the sentinel-exclusion
  // path end to end and surfaces it in the "unresolved" section of the
  // generated report.
  '__roadmap__',
];

/**
 * Sentinel / placeholder values that look like skillArea strings but are not
 * real skills, and must NOT be migrated into the catalog.
 *
 * `__roadmap__` is a pseudo-bucket sentinel used internally by
 * recommendation.engine.ts (`buildRoadmapAdjustmentItems`) to group
 * roadmap-level (not skill-level) recommendation items. It is excluded here
 * on purpose.
 */
export const SENTINEL_VALUES: string[] = ['__roadmap__'];

export type SkillAreaMigrationEntry = {
  skillArea: string;
  skillId: string;
};

export type SkillAreaMigrationResult = {
  resolved: SkillAreaMigrationEntry[];
  unresolved: string[];
};

/**
 * For each distinct skillArea value, finds-or-creates the corresponding
 * catalog entry via SkillCatalogService.findOrCreateByName. Values that are
 * empty/blank or known sentinels are excluded and reported separately.
 */
export async function migrateSkillAreas(
  skillCatalogService: SkillCatalogService,
  values: string[] = KNOWN_SKILL_AREA_VALUES,
): Promise<SkillAreaMigrationResult> {
  const distinctValues = [...new Set(values)];

  const resolved: SkillAreaMigrationEntry[] = [];
  const unresolved: string[] = [];

  for (const value of distinctValues) {
    const trimmed = value?.trim() ?? '';

    if (trimmed.length === 0 || SENTINEL_VALUES.includes(trimmed)) {
      unresolved.push(value);
      continue;
    }

    const skill = await skillCatalogService.findOrCreateByName(trimmed);
    resolved.push({ skillArea: value, skillId: skill.getId().toString() });
  }

  return { resolved, unresolved };
}
