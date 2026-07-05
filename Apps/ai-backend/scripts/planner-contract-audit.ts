/**
 * WP-AI-02 Phase 4 — static contract verification for AI Brain planners.
 * Regex/text-based, not type-aware — flags for human review rather than an
 * authoritative pass/fail. Manual command only, not wired into CI:
 *   npm run audit:planner-contract
 *
 * Verifies, for every planner service listed in PLANNER_FILES, that it:
 *   1. extends BasePlannerService
 *   2. exposes a promptVersion field
 *   3. exposes a capability field
 *   4. validates Explainability (inherited from BasePlannerService.execute();
 *      flagged FAIL if the planner overrides execute() itself, which would
 *      bypass the shared validation call)
 *   5. emits metrics (implements emitMetrics() and calls this.metrics inside it)
 *   6. emits audit events (implements buildAuditEvent())
 *   7. uses ResilientLlmGateway (imports it and threads it into super())
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '../src/modules');

interface PlannerFile {
  capabilityName: string;
  file: string;
}

interface CheckResult {
  rule: string;
  pass: boolean;
  detail: string;
}

interface PlannerReport {
  capabilityName: string;
  file: string;
  checks: CheckResult[];
}

function rel(p: string): string {
  return path.relative(path.join(__dirname, '../..'), p).replace(/\\/g, '/');
}

function findPlannerFiles(): PlannerFile[] {
  const planners: PlannerFile[] = [];
  for (const moduleDir of fs.readdirSync(SRC_ROOT, { withFileTypes: true })) {
    if (!moduleDir.isDirectory() || !moduleDir.name.endsWith('-planner')) continue;
    const servicesDir = path.join(SRC_ROOT, moduleDir.name, 'application/services');
    if (!fs.existsSync(servicesDir)) continue;
    for (const entry of fs.readdirSync(servicesDir)) {
      if (entry.endsWith('.service.ts')) {
        planners.push({ capabilityName: moduleDir.name, file: path.join(servicesDir, entry) });
      }
    }
  }
  return planners;
}

function auditPlanner(planner: PlannerFile): PlannerReport {
  const content = fs.readFileSync(planner.file, 'utf8');
  const checks: CheckResult[] = [];

  const extendsBase = /extends\s+BasePlannerService\s*<|extends\s+BasePlannerService\s*\{/.test(content);
  checks.push({
    rule: 'EXTENDS_BASE_PLANNER_SERVICE',
    pass: extendsBase,
    detail: extendsBase ? 'extends BasePlannerService' : 'does not extend BasePlannerService',
  });

  const hasPromptVersion = /protected\s+readonly\s+promptVersion\s*=/.test(content);
  checks.push({
    rule: 'EXPOSES_PROMPT_VERSION',
    pass: hasPromptVersion,
    detail: hasPromptVersion ? 'declares protected readonly promptVersion' : 'missing promptVersion field',
  });

  const hasCapability = /protected\s+readonly\s+capability\s*=/.test(content);
  checks.push({
    rule: 'EXPOSES_CAPABILITY',
    pass: hasCapability,
    detail: hasCapability ? 'declares protected readonly capability' : 'missing capability field',
  });

  const overridesExecute = /\bexecute\s*\(/.test(content.replace(/this\.execute\(/g, ''));
  const validatesExplainability = extendsBase && !overridesExecute;
  checks.push({
    rule: 'VALIDATES_EXPLAINABILITY',
    pass: validatesExplainability,
    detail: validatesExplainability
      ? 'inherits explainability validation from BasePlannerService.execute() (no local execute() override found)'
      : overridesExecute
        ? 'overrides execute() — verify it still calls explainabilityRules.validate()'
        : 'does not extend BasePlannerService, so no shared validation applies',
  });

  const emitMetricsMatch = content.match(/protected\s+emitMetrics\s*\([^)]*\)\s*:\s*void\s*\{([\s\S]*?)\n {2}\}/);
  const emitsMetrics = !!emitMetricsMatch && /this\.metrics\?\./.test(emitMetricsMatch[1]);
  checks.push({
    rule: 'EMITS_METRICS',
    pass: emitsMetrics,
    detail: emitsMetrics
      ? 'implements emitMetrics() and calls this.metrics inside it'
      : 'emitMetrics() missing or does not call this.metrics',
  });

  const emitsAudit = /protected\s+buildAuditEvent\s*\(/.test(content);
  checks.push({
    rule: 'EMITS_AUDIT_EVENTS',
    pass: emitsAudit,
    detail: emitsAudit ? 'implements buildAuditEvent()' : 'buildAuditEvent() missing',
  });

  const usesGateway =
    /import\s*\{\s*ResilientLlmGateway\s*\}/.test(content) && /super\([^)]*llmGateway/.test(content);
  checks.push({
    rule: 'USES_RESILIENT_LLM_GATEWAY',
    pass: usesGateway,
    detail: usesGateway
      ? 'imports ResilientLlmGateway and threads it into super()'
      : 'does not import/forward ResilientLlmGateway',
  });

  return { capabilityName: planner.capabilityName, file: planner.file, checks };
}

function main() {
  const planners = findPlannerFiles();
  const reports = planners.map(auditPlanner);

  const lines: string[] = [];
  lines.push('# Planner Contract Report (auto-generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    'Source: `Apps/ai-backend/scripts/planner-contract-audit.ts` — regex-based heuristics, not a type checker. Run via `npm run audit:planner-contract`. Not wired into CI; treat findings as a manual review checklist.',
  );
  lines.push('');

  const totalChecks = reports.reduce((sum, r) => sum + r.checks.length, 0);
  const totalPass = reports.reduce((sum, r) => sum + r.checks.filter((c) => c.pass).length, 0);
  const allPass = totalPass === totalChecks;

  lines.push(`**${reports.length} planner(s) audited, ${totalPass}/${totalChecks} checks passed. Overall: ${allPass ? 'PASS' : 'FAIL'}.**`);
  lines.push('');

  for (const report of reports) {
    const planPass = report.checks.every((c) => c.pass);
    lines.push(`## ${report.capabilityName} — ${planPass ? 'PASS' : 'FAIL'}`);
    lines.push('');
    lines.push(`File: \`${rel(report.file)}\``);
    lines.push('');
    lines.push('| Rule | Status | Detail |');
    lines.push('| --- | --- | --- |');
    for (const check of report.checks) {
      lines.push(`| ${check.rule} | ${check.pass ? 'PASS' : 'FAIL'} | ${check.detail.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }

  const report = lines.join('\n');
  const outPath = path.join(__dirname, '../../../Docs/12_AI/PlannerContractReport.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report);
  console.log(report);
  console.log(`Written to ${outPath}`);

  if (!allPass) {
    process.exitCode = 1;
  }
}

main();
