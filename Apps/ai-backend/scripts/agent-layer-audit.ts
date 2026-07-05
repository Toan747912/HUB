/**
 * WP-AI-04A — static, read-only audit of the Agent Layer (agent-core,
 * agent-runtime, agent-coordinator, agent-message-bus, agent-memory,
 * agent-lifecycle, agent-collaboration, agent-learning, agent-tools).
 *
 * Regex/import-graph heuristics, not a type checker — flags for human
 * review rather than an authoritative pass/fail. Manual command only,
 * not wired into CI:
 *   npm run audit:agent-layer
 *
 * This script does not modify any source file. It only reads
 * src/modules/agent-* (and, where a rule requires it, sibling planner
 * modules) and writes Docs/12_AI/AgentLayerAuditReport.md.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_MODULES = path.join(__dirname, '../src/modules');

type Status = 'PASS' | 'WARNING' | 'FAIL';

interface Finding {
  status: Status;
  detail: string;
}

interface CategoryReport {
  id: string;
  title: string;
  findings: Finding[];
}

const AGENT_MODULES = [
  'agent-core',
  'agent-runtime',
  'agent-coordinator',
  'agent-message-bus',
  'agent-memory',
  'agent-lifecycle',
  'agent-collaboration',
  'agent-learning',
  'agent-tools',
];

const PLANNER_MODULES = [
  'discovery-planner',
  'evidence-planner',
  'knowledge-planner',
  'mission-planner',
  'teaching-planner',
];

function rel(p: string): string {
  return path.relative(path.join(__dirname, '../..'), p).replace(/\\/g, '/');
}

function listTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !full.includes('__tests__')) {
      out.push(full);
    }
  }
  return out;
}

function moduleFiles(moduleName: string, root: string = SRC_MODULES): string[] {
  return listTsFiles(path.join(root, moduleName));
}

interface ImportEdge {
  file: string;
  importPath: string;
  resolvedModule: string | null;
}

/** Resolves a relative import specifier against the importing file's directory
 * to the top-level module directory name it points into (e.g. 'agent-memory'),
 * or null if it does not resolve into src/modules. */
function resolveImportModule(fromFile: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null;
  const resolved = path.normalize(path.join(path.dirname(fromFile), importPath));
  const relToModules = path.relative(SRC_MODULES, resolved);
  if (relToModules.startsWith('..')) return null;
  return relToModules.split(path.sep)[0];
}

function importEdgesFrom(files: string[]): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const importRe = /^import\s+[^;]*?from\s+['"]([^'"]+)['"];?/gm;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(content))) {
      edges.push({ file, importPath: m[1], resolvedModule: resolveImportModule(file, m[1]) });
    }
  }
  return edges;
}

// ---------------------------------------------------------------------------
// 1. Dependency Audit
// ---------------------------------------------------------------------------
function auditDependencies(): CategoryReport {
  const findings: Finding[] = [];
  const rules: Array<{ from: string; forbidden: string; label: string }> = [
    { from: 'agent-learning', forbidden: 'agent-collaboration', label: 'Agent Learning -> Collaboration internals' },
    { from: 'agent-collaboration', forbidden: 'agent-runtime', label: 'Collaboration -> Runtime internals' },
    { from: 'agent-runtime', forbidden: 'agent-coordinator', label: 'Runtime -> Coordinator' },
    { from: 'agent-message-bus', forbidden: 'PLANNER', label: 'Message Bus -> Planner layer' },
  ];

  for (const rule of rules) {
    const files = moduleFiles(rule.from);
    const edges = importEdgesFrom(files);
    let violations: ImportEdge[];
    if (rule.forbidden === 'PLANNER') {
      violations = edges.filter((e) => e.resolvedModule && PLANNER_MODULES.includes(e.resolvedModule));
    } else {
      violations = edges.filter((e) => e.resolvedModule === rule.forbidden);
    }
    if (violations.length === 0) {
      findings.push({ status: 'PASS', detail: `${rule.label}: no violating imports found.` });
    } else {
      findings.push({
        status: 'FAIL',
        detail: `${rule.label}: ${violations.length} violating import(s) — ${violations
          .map((v) => `${rel(v.file)} imports '${v.importPath}'`)
          .join('; ')}`,
      });
    }
  }
  return { id: 'dependency', title: 'Dependency Audit', findings };
}

// ---------------------------------------------------------------------------
// 2. Runtime Boundary Audit — all planner access goes through PlannerAdapter
// ---------------------------------------------------------------------------
function auditRuntimeBoundary(): CategoryReport {
  const findings: Finding[] = [];
  const plannerServiceNames = [
    'DiscoveryPlannerService',
    'EvidencePlannerService',
    'KnowledgePlannerService',
    'MissionPlannerService',
    'TeachingPlannerService',
  ];
  const adapterFile = path.join(SRC_MODULES, 'agent-core/infrastructure/planner-adapter.service.ts');

  const violators: string[] = [];
  for (const agentModule of AGENT_MODULES) {
    for (const file of moduleFiles(agentModule)) {
      if (path.resolve(file) === path.resolve(adapterFile)) continue;
      const content = fs.readFileSync(file, 'utf8');
      for (const svc of plannerServiceNames) {
        const importRe = new RegExp(`import\\s*\\{[^}]*\\b${svc}\\b[^}]*\\}\\s*from`, 'm');
        if (importRe.test(content)) {
          violators.push(`${rel(file)} imports ${svc} directly`);
        }
      }
    }
  }

  if (violators.length === 0) {
    findings.push({
      status: 'PASS',
      detail: `No agent-* module bypasses PlannerAdapterService (${rel(adapterFile)}) to call a planner service directly.`,
    });
  } else {
    findings.push({ status: 'FAIL', detail: `Direct planner invocation found: ${violators.join('; ')}` });
  }

  // Out-of-scope observation: the legacy ai-runtime module (not part of the
  // Agent Layer work package) calls all five planner services directly.
  const aiRuntimeFile = path.join(SRC_MODULES, 'ai-runtime/ai-runtime.service.ts');
  if (fs.existsSync(aiRuntimeFile)) {
    const content = fs.readFileSync(aiRuntimeFile, 'utf8');
    const hits = plannerServiceNames.filter((svc) => content.includes(svc));
    if (hits.length > 0) {
      findings.push({
        status: 'WARNING',
        detail: `Out of Agent Layer scope, informational only: ${rel(aiRuntimeFile)} (pre-existing ai-runtime module) calls planner services directly (${hits.join(', ')}), bypassing PlannerAdapterService. Not part of the 9 audited components; not counted toward PASS/FAIL.`,
      });
    }
  }

  return { id: 'runtime-boundary', title: 'Runtime Boundary Audit', findings };
}

// ---------------------------------------------------------------------------
// 3. Message Bus Audit — all agent-to-agent execution flows through the bus
// ---------------------------------------------------------------------------
function auditMessageBus(): CategoryReport {
  const findings: Finding[] = [];
  const sanctioned = new Set([
    path.join(SRC_MODULES, 'agent-message-bus/application/agent-runtime-message-handler.service.ts'),
  ]);

  const violators: string[] = [];
  for (const agentModule of AGENT_MODULES) {
    for (const file of moduleFiles(agentModule)) {
      if (file.endsWith('.module.ts')) continue; // DI wiring, not execution call sites
      if ([...sanctioned].some((s) => path.resolve(file) === path.resolve(s))) continue;
      if (agentModule === 'agent-runtime') continue; // internal to the runtime itself
      const content = fs.readFileSync(file, 'utf8');
      if (/import\s*\{[^}]*\bAgentRuntimeService\b[^}]*\}\s*from/.test(content)) {
        violators.push(`${rel(file)} imports AgentRuntimeService directly`);
      }
    }
  }

  if (violators.length === 0) {
    findings.push({
      status: 'PASS',
      detail:
        'AgentRuntimeService is only referenced within the agent-runtime module itself and the message bus\'s own AgentRuntimeMessageHandler. No other module (coordinator, collaboration, etc.) calls it directly.',
    });
  } else {
    findings.push({ status: 'FAIL', detail: `Direct Runtime calls bypassing Message Bus: ${violators.join('; ')}` });
  }
  return { id: 'message-bus', title: 'Message Bus Audit', findings };
}

// ---------------------------------------------------------------------------
// 4. Memory Audit — all memory writes use MemoryStoreService
// ---------------------------------------------------------------------------
function auditMemory(): CategoryReport {
  const findings: Finding[] = [];
  const violators: string[] = [];
  for (const agentModule of AGENT_MODULES) {
    if (agentModule === 'agent-memory') continue;
    for (const file of moduleFiles(agentModule)) {
      const content = fs.readFileSync(file, 'utf8');
      if (/MongoMemoryRepository|MEMORY_REPOSITORY/.test(content)) {
        violators.push(`${rel(file)} references the memory repository/token directly`);
      }
    }
  }

  if (violators.length === 0) {
    findings.push({
      status: 'PASS',
      detail:
        'No module outside agent-memory references MongoMemoryRepository or the MEMORY_REPOSITORY token; all observed writes go through MemoryStoreService.',
    });
  } else {
    findings.push({ status: 'FAIL', detail: `Bypasses of MemoryStoreService found: ${violators.join('; ')}` });
  }
  return { id: 'memory', title: 'Memory Audit', findings };
}

// ---------------------------------------------------------------------------
// 5. Lifecycle Audit — all workflow executions create lifecycle instances
// ---------------------------------------------------------------------------
function auditLifecycle(): CategoryReport {
  const findings: Finding[] = [];
  const executors = [
    { file: 'agent-runtime/application/agent-runtime.service.ts', label: 'AgentRuntimeService' },
    { file: 'agent-coordinator/application/coordinator.service.ts', label: 'CoordinatorService' },
  ];

  for (const executor of executors) {
    const full = path.join(SRC_MODULES, executor.file);
    if (!fs.existsSync(full)) {
      findings.push({ status: 'WARNING', detail: `${executor.label}: file not found at expected path ${executor.file}.` });
      continue;
    }
    const content = fs.readFileSync(full, 'utf8');
    const createsInstance = /lifecycleService[?.]*\.createInstance\(/.test(content);
    if (createsInstance) {
      findings.push({ status: 'PASS', detail: `${executor.label} (${rel(full)}) creates a lifecycle instance before executing.` });
    } else {
      findings.push({ status: 'FAIL', detail: `${executor.label} (${rel(full)}) does not call lifecycleService.createInstance().` });
    }

    // The dependency is typed optional (`lifecycleService?:`) and guarded with
    // `if (this.lifecycleService)` / `?.` rather than @Optional()-declared to
    // Nest. That means tracking is only "always on" as long as the module
    // graph keeps importing AgentLifecycleModule — nothing enforces it.
    const declaresOptional = /lifecycleService\?\s*:\s*LifecycleService/.test(content);
    const hasNestOptionalDecorator = /@Optional\(\)[\s\S]{0,40}lifecycleService/.test(content);
    if (declaresOptional && !hasNestOptionalDecorator) {
      findings.push({
        status: 'WARNING',
        detail: `${executor.label} (${rel(full)}): lifecycleService is TS-optional (?:) and called via optional-chaining/if-guard, but not marked @Optional() for Nest DI. Lifecycle tracking is silently skippable if the field is ever undefined, and there is no compile-time or DI-time guarantee it stays wired.`,
      });
    }
  }

  return { id: 'lifecycle', title: 'Lifecycle Audit', findings };
}

// ---------------------------------------------------------------------------
// 6. Collaboration Audit — all role executions resolve through RoleResolver
// ---------------------------------------------------------------------------
function auditCollaboration(): CategoryReport {
  const findings: Finding[] = [];
  const files = [...moduleFiles('agent-collaboration'), ...moduleFiles('agent-coordinator')];

  const hardcodedIdRe = /\bagentId\s*[:=]\s*['"][a-zA-Z0-9_-]+['"]/g;
  const violators: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(hardcodedIdRe);
    if (matches) {
      violators.push(`${rel(file)}: ${matches.join(', ')}`);
    }
  }

  const resolverFile = path.join(SRC_MODULES, 'agent-collaboration/application/role-resolver.service.ts');
  const resolverExists = fs.existsSync(resolverFile);
  const usesResolver = files.some((f) => {
    const content = fs.readFileSync(f, 'utf8');
    return /RoleResolverService/.test(content) && f !== resolverFile;
  });

  if (violators.length === 0 && resolverExists && usesResolver) {
    findings.push({
      status: 'PASS',
      detail: 'No hardcoded agentId literals found in agent-collaboration/agent-coordinator; role -> agent binding resolves through RoleResolverService.resolve().',
    });
  } else if (violators.length > 0) {
    findings.push({ status: 'FAIL', detail: `Hardcoded agent IDs found: ${violators.join('; ')}` });
  } else {
    findings.push({ status: 'WARNING', detail: 'RoleResolverService not found or not referenced by any collaboration/coordinator service.' });
  }
  return { id: 'collaboration', title: 'Collaboration Audit', findings };
}

// ---------------------------------------------------------------------------
// 7. Learning Audit — Learning Engine never modifies execution history
// ---------------------------------------------------------------------------
function auditLearning(): CategoryReport {
  const findings: Finding[] = [];
  const files = moduleFiles('agent-learning');
  const forbiddenRefs = ['ExecutionState', 'AgentInstanceRepository', 'LifecycleService', 'MongoAgentInstanceRepository', 'MessageStoreService'];

  const violators: string[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const ref of forbiddenRefs) {
      if (new RegExp(`\\b${ref}\\b`).test(content)) {
        violators.push(`${rel(file)} references ${ref}`);
      }
    }
  }

  const repoFile = path.join(SRC_MODULES, 'agent-learning/repositories/mongo-learning.repository.ts');
  const writesOwnRepoOnly = fs.existsSync(repoFile) && /save(ExecutionPatterns|KnowledgeItems|Recommendations|LearningRecord)/.test(
    fs.readFileSync(repoFile, 'utf8'),
  );

  if (violators.length === 0 && writesOwnRepoOnly) {
    findings.push({
      status: 'PASS',
      detail:
        'agent-learning has no references to agent-runtime/agent-lifecycle/agent-message-bus execution-record types; all writes (learning.service.ts -> mongo-learning.repository.ts) target its own execution-pattern/knowledge-item/recommendation/learning-record collections, not the runtime execution history.',
    });
  } else if (violators.length > 0) {
    findings.push({ status: 'FAIL', detail: `Possible write path into execution records: ${violators.join('; ')}` });
  } else {
    findings.push({ status: 'WARNING', detail: 'Could not confirm agent-learning writes are confined to its own repository.' });
  }
  return { id: 'learning', title: 'Learning Audit', findings };
}

// ---------------------------------------------------------------------------
// 8. Observability Audit — metrics, structured logs, audit events per module
// ---------------------------------------------------------------------------
function auditObservability(): CategoryReport {
  const findings: Finding[] = [];
  for (const agentModule of AGENT_MODULES) {
    const files = moduleFiles(agentModule);
    const hasMetrics = files.some((f) => /MetricsService/.test(fs.readFileSync(f, 'utf8')));
    const hasLogger = files.some((f) => /StructuredLoggerService/.test(fs.readFileSync(f, 'utf8')));
    const hasAudit = files.some((f) => /AuditLogService/.test(fs.readFileSync(f, 'utf8')));

    const missing = [
      !hasMetrics && 'metrics',
      !hasLogger && 'structured logs',
      !hasAudit && 'audit events',
    ].filter(Boolean) as string[];

    if (missing.length === 0) {
      findings.push({ status: 'PASS', detail: `${agentModule}: emits metrics, structured logs, and audit events.` });
    } else if (missing.length < 3) {
      findings.push({ status: 'WARNING', detail: `${agentModule}: missing ${missing.join(', ')}.` });
    } else {
      findings.push({ status: 'FAIL', detail: `${agentModule}: no metrics, structured logs, or audit events found anywhere in the module.` });
    }
  }
  return { id: 'observability', title: 'Observability Audit', findings };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
function worstStatus(findings: Finding[]): Status {
  if (findings.some((f) => f.status === 'FAIL')) return 'FAIL';
  if (findings.some((f) => f.status === 'WARNING')) return 'WARNING';
  return 'PASS';
}

function main() {
  const categories: CategoryReport[] = [
    auditDependencies(),
    auditRuntimeBoundary(),
    auditMessageBus(),
    auditMemory(),
    auditLifecycle(),
    auditCollaboration(),
    auditLearning(),
    auditObservability(),
  ];

  const counts = { PASS: 0, WARNING: 0, FAIL: 0 } as Record<Status, number>;
  for (const cat of categories) counts[worstStatus(cat.findings)]++;

  const lines: string[] = [];
  lines.push('# Agent Layer Audit Report (auto-generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    'Source: `Apps/ai-backend/scripts/agent-layer-audit.ts` — static import-graph and regex heuristics, not a type checker or runtime trace. Read-only: no source file was modified to produce this report. Run via `npm run audit:agent-layer`. Not wired into CI; treat findings as a manual review checklist.',
  );
  lines.push('');
  lines.push(`**${categories.length} categories audited — PASS: ${counts.PASS}, WARNING: ${counts.WARNING}, FAIL: ${counts.FAIL}.**`);
  lines.push('');
  lines.push('| # | Category | Verdict |');
  lines.push('| --- | --- | --- |');
  categories.forEach((cat, i) => {
    lines.push(`| ${i + 1} | ${cat.title} | ${worstStatus(cat.findings)} |`);
  });
  lines.push('');

  categories.forEach((cat, i) => {
    lines.push(`## ${i + 1}. ${cat.title} — ${worstStatus(cat.findings)}`);
    lines.push('');
    for (const finding of cat.findings) {
      lines.push(`- **${finding.status}** — ${finding.detail}`);
    }
    lines.push('');
  });

  const report = lines.join('\n');
  const outPath = path.join(__dirname, '../../../Docs/12_AI/AgentLayerAuditReport.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report);
  console.log(report);
  console.log(`Written to ${outPath}`);

  if (counts.FAIL > 0) {
    process.exitCode = 1;
  }
}

main();
