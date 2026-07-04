/**
 * Static heuristic audit of Atomic Outbox compliance. Regex-based, not type-aware —
 * flags for human review rather than an authoritative pass/fail. Companion to
 * audit-persistence.ts; re-run after touching any *-command.service.ts, *.repository.ts,
 * or the outbox infrastructure.
 *
 * IMPORTANT: at the time this script was written, none of the command services actually
 * wrap the domain write + outbox write in a shared MongoDB transaction — repository.save()
 * and eventPublisher.publishMany() are two independent sequential calls everywhere. This
 * script reports that reality; it does not assume the pattern already holds.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '../src');

type Severity = 'violation' | 'warning';

interface Finding {
  file: string;
  line: number;
  rule: string;
  severity: Severity;
  message: string;
  context: string;
}

interface MethodBody {
  name: string;
  isPrivate: boolean;
  params: string;
  body: string;
  startLine: number;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function rel(p: string): string {
  return path.relative(path.join(__dirname, '..'), p).replace(/\\/g, '/');
}

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/** Scans forward from the index of an opening '{' to find its matching close.
 *  Naive — does not special-case braces inside strings/template literals/regex/comments.
 *  Adequate for the flat method bodies found in this codebase's services/repositories. */
function findMatchingBrace(content: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractMethodBodies(content: string): MethodBody[] {
  const methods: MethodBody[] = [];
  const re = /^\s{2}(private\s+|protected\s+|public\s+)?(?:async\s+)?([a-zA-Z_]\w*)\s*\(([^()]*)\)\s*(?::\s*[\w<>[\].| ]+)?\s*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const [, visibility, name, params] = m;
    if (name === 'constructor') continue;
    const openBraceIndex = m.index + m[0].length - 1;
    const closeBraceIndex = findMatchingBrace(content, openBraceIndex);
    if (closeBraceIndex === -1) continue;
    methods.push({
      name,
      isPrivate: !!visibility && /private|protected/.test(visibility),
      params: params.trim(),
      body: content.slice(openBraceIndex, closeBraceIndex + 1),
      startLine: lineAt(content, m.index),
    });
  }
  return methods;
}

const WRITE_VERB_RE = /^(save|create|update|delete|insert|remove|upsert|patch|archive|complete|publish(?!Many))/i;
const REPO_WRITE_CALL_RE = /\bthis\.(\w*[Rr]epository\w*|repository)\.(\w+)\s*\(/g;
const TRANSACTION_RE = /\bwithTransaction\s*\(|\bstartSession\s*\(/;
const EVENT_EMIT_RE = /\beventPublisher\.(publish|publishMany)\s*\(/;
const SESSION_PARAM_RE = /\b(session|clientSession|opts\??\s*:\s*\{[^}]*session)/i;
const SESSION_OPTION_RE = /\{\s*session[,:\s]/;

// ---------- Rule 1 & 2: command-service orchestration methods ----------

function isCommandServiceFile(content: string): boolean {
  return /eventPublisher\s*[:;]/.test(content) || /private\s+readonly\s+eventPublisher/.test(content);
}

function auditCommandService(file: string, content: string, findings: Finding[]): void {
  for (const method of extractMethodBodies(content)) {
    if (method.isPrivate) continue;
    const writeCalls = [...method.body.matchAll(REPO_WRITE_CALL_RE)].filter(([, , verb]) =>
      WRITE_VERB_RE.test(verb),
    );
    if (writeCalls.length === 0) continue;

    const hasTransaction = TRANSACTION_RE.test(method.body);
    const hasEmission = EVENT_EMIT_RE.test(method.body);

    if (!hasEmission) {
      findings.push({
        file,
        line: method.startLine,
        rule: 'MISSING_EVENT_EMISSION',
        severity: 'violation',
        message: `Method "${method.name}" writes to the repository but never calls eventPublisher.publish/publishMany — the mutation produces no domain event.`,
        context: writeCalls[0][0],
      });
    } else if (!hasTransaction) {
      findings.push({
        file,
        line: method.startLine,
        rule: 'NON_ATOMIC_WRITE_AND_EMIT',
        severity: 'violation',
        message: `Method "${method.name}" performs the repository write and the outbox emission as two independent sequential calls with no shared withTransaction/startSession — a crash between them silently loses the event or leaves an orphaned write.`,
        context: writeCalls[0][0],
      });
    }
  }
}

// ---------- Rule 3: repository write methods missing a session parameter ----------

function isRepositoryFile(file: string): boolean {
  return /\.repository\.ts$/.test(file) && !/\.contract\.ts$/.test(file) && !/__tests__/.test(file);
}

function auditRepositorySessionSupport(file: string, content: string, findings: Finding[]): void {
  const isOutbox = /[/\\]infrastructure[/\\]outbox[/\\]/.test(file);
  for (const method of extractMethodBodies(content)) {
    if (method.isPrivate) continue;
    if (!WRITE_VERB_RE.test(method.name)) continue;

    const paramsAcceptSession = SESSION_PARAM_RE.test(method.params);
    const bodyPassesSession = SESSION_OPTION_RE.test(method.body);

    if (!paramsAcceptSession && !bodyPassesSession) {
      findings.push({
        file,
        line: method.startLine,
        rule: isOutbox ? 'OUTBOX_WRITE_NO_SESSION' : 'DOMAIN_WRITE_NO_SESSION',
        severity: 'violation',
        message: isOutbox
          ? `OutboxRepository method "${method.name}" accepts no session parameter and passes none to the underlying Mongo call — it cannot be enlisted in a caller-managed transaction.`
          : `Repository write method "${method.name}" accepts no session parameter — it cannot participate in a shared transaction with the outbox write.`,
        context: `${method.name}(${method.params})`,
      });
    }
  }
}

// ---------- Rule 4: repository writes bypassing the command-service/event-emission flow ----------

function isOrchestrationLayer(file: string): boolean {
  return /application[/\\]services[/\\].*\.service\.ts$/.test(file) || /\.repository\.ts$/.test(file) || /__tests__/.test(file);
}

function auditBypass(file: string, content: string, findings: Finding[]): void {
  if (isOrchestrationLayer(file)) return;
  if (!/[/\\](interface|application)[/\\]/.test(file)) return;

  let m: RegExpExecArray | null;
  const re = new RegExp(REPO_WRITE_CALL_RE.source, 'g');
  while ((m = re.exec(content))) {
    const [full, , verb] = m;
    if (!WRITE_VERB_RE.test(verb)) continue;
    findings.push({
      file,
      line: lineAt(content, m.index),
      rule: 'DIRECT_REPOSITORY_WRITE_BYPASS',
      severity: 'warning',
      message: `Repository write call ("${verb}") found outside the *-command.service.ts orchestration layer — verify this path still emits a domain event via eventPublisher.`,
      context: full,
    });
  }
}

function main() {
  const allFiles = walk(SRC_ROOT).filter((f) => /\.ts$/.test(f) && !/\.spec\.ts$/.test(f));
  const findings: Finding[] = [];

  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf8');

    if (/\.service\.ts$/.test(file) && isCommandServiceFile(content)) {
      auditCommandService(file, content, findings);
    }
    if (isRepositoryFile(file)) {
      auditRepositorySessionSupport(file, content, findings);
    }
    auditBypass(file, content, findings);
  }

  findings.sort((a, b) => rel(a.file).localeCompare(rel(b.file)) || a.line - b.line);

  const violations = findings.filter((f) => f.severity === 'violation');
  const warnings = findings.filter((f) => f.severity === 'warning');

  const lines: string[] = [];
  lines.push('# Outbox Atomicity Report (auto-generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    `Source: \`Apps/ai-backend/scripts/audit-outbox.ts\` — regex-based heuristics, not a type checker. Run via \`npm run audit:outbox\`. Not wired into CI; treat findings as a manual review checklist until the underlying pattern is actually implemented.`,
  );
  lines.push('');
  lines.push(`**${violations.length} violation(s), ${warnings.length} warning(s).**`);
  lines.push('');
  lines.push(
    'Rules: `MISSING_EVENT_EMISSION` (write with no event published), `NON_ATOMIC_WRITE_AND_EMIT` (write + emit present but not in a shared transaction), `DOMAIN_WRITE_NO_SESSION` / `OUTBOX_WRITE_NO_SESSION` (write method cannot accept a session, so it could never join a transaction even if the caller wrapped one), `DIRECT_REPOSITORY_WRITE_BYPASS` (repository write outside the command-service orchestration layer — warning only, may be a false positive for read-side code).',
  );
  lines.push('');

  if (findings.length === 0) {
    lines.push('No findings.');
  } else {
    lines.push('| File | Line | Rule | Severity | Message |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const f of findings) {
      lines.push(
        `| ${rel(f.file)} | ${f.line} | ${f.rule} | ${f.severity} | ${f.message.replace(/\|/g, '\\|')} |`,
      );
    }
  }

  const report = lines.join('\n') + '\n';
  const outPath = path.join(__dirname, '../../../Docs/06_Database/OutboxAtomicityReport.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report);
  console.log(report);
  console.log(`Written to ${outPath}`);
}

main();
