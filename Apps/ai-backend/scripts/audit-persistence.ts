/**
 * Static heuristic audit of Mongo persistence coverage. Regex-based, not type-aware —
 * flags for human review rather than an authoritative pass/fail. Re-run after touching
 * any *.repository.ts / *.schema.ts file.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '../src');

interface MethodInfo {
  name: string;
  params: string;
  isPrivate: boolean;
}

interface RepositoryReport {
  file: string;
  mongoBacked: boolean;
  methods: MethodInfo[];
  hasCreate: boolean;
  hasUpdate: boolean;
  hasDelete: boolean;
  hasFindById: boolean;
  hasFilterQuery: boolean;
  narrowQueryOnly: boolean;
  unfilteredFindAll: boolean;
  usesTransaction: boolean;
  schemaFile: string | null;
  indexedFields: string[];
  outboxWired: boolean;
  outboxApplicable: boolean;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function findRepositoryFiles(allFiles: string[]): string[] {
  return allFiles.filter((f) => /\.repository\.ts$/.test(f) && !/\.contract\.ts$/.test(f));
}

function extractMethods(content: string): MethodInfo[] {
  const methods: MethodInfo[] = [];
  const re = /^\s{2}(private\s+|protected\s+|public\s+)?(?:async\s+)?([a-zA-Z_]\w*)\s*\(([^()]*)\)\s*(?::\s*[\w<>[\].| ]+)?\s*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const [, visibility, name, params] = m;
    if (name === 'constructor') continue;
    methods.push({ name, params: params.trim(), isPrivate: !!visibility && /private|protected/.test(visibility) });
  }
  return methods;
}

function categorize(methods: MethodInfo[]) {
  const pub = methods.filter((m) => !m.isPrivate);
  const hasCreate = pub.some((m) => /^(create|insert|save)/i.test(m.name));
  const hasUpdate = pub.some((m) => /^(save|update|patch|mark|revoke)/i.test(m.name));
  const hasDelete = pub.some((m) => /^(delete|remove)/i.test(m.name));
  const hasFindById = pub.some((m) => /^findById/i.test(m.name));

  const queryMethods = pub.filter(
    (m) => /^(find|query)/i.test(m.name) && !/^findById/i.test(m.name),
  );
  const hasFilterQuery = queryMethods.length > 0;
  // "narrow" = every query method takes exactly one required (non-optional) scalar param
  // and is named after an exact-match lookup rather than a general filter (findAll/findBy<Domain>).
  const narrowQueryOnly =
    hasFilterQuery &&
    queryMethods.every((m) => {
      const params = m.params.split(',').filter(Boolean);
      const singleRequiredParam = params.length === 1 && !params[0].includes('?');
      const looksExactMatch = !/^findAll$/i.test(m.name) && singleRequiredParam;
      return looksExactMatch;
    });
  // findAll with zero params has no filter at all — opposite failure mode from "narrow":
  // full unindexed collection scan risk rather than an overly-specific lookup.
  const unfilteredFindAll = pub.some((m) => /^findAll$/i.test(m.name) && m.params.length === 0);

  return { hasCreate, hasUpdate, hasDelete, hasFindById, hasFilterQuery, narrowQueryOnly, unfilteredFindAll };
}

function findSchemaFile(repoFile: string, allFiles: string[]): string | null {
  // repositories live at .../repositories/<name>.repository.ts, schemas at .../schemas/<name>.schema.ts
  // or, for infra singletons, siblings in the same directory.
  const dir = path.dirname(repoFile);
  const parentDir = path.dirname(dir);
  const schemaDir = path.join(parentDir, 'schemas');
  const candidates = allFiles.filter((f) => /\.schema\.ts$/.test(f));

  const sameTree = candidates.filter((f) => f.startsWith(schemaDir) || f.startsWith(dir));
  if (sameTree.length === 1) return sameTree[0];
  if (sameTree.length > 1) {
    // pick the schema whose base name shares the longest prefix with the repo base name
    const repoBase = path.basename(repoFile).replace(/\.repository\.ts$/, '').replace(/^mongo-/, '');
    return (
      sameTree.find((f) => path.basename(f).replace(/\.schema\.ts$/, '') === repoBase) ??
      sameTree[0]
    );
  }
  return null;
}

function extractIndexedFields(schemaContent: string): string[] {
  const fields = new Set<string>();
  const propRe = /(\w+)\s*:\s*\{[^}]*(?:index\s*:\s*true|unique\s*:\s*true)[^}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(schemaContent))) fields.add(m[1]);

  const compoundRe = /\.index\(\s*\{([^}]*)\}/g;
  while ((m = compoundRe.exec(schemaContent))) {
    const keys = m[1]
      .split(',')
      .map((s) => s.split(':')[0].trim())
      .filter(Boolean);
    fields.add(`{${keys.join(',')}}`);
  }
  return Array.from(fields);
}

/** 'n/a' for the outbox/audit sinks themselves — "is this wired to the outbox" is not a
 *  meaningful question for the outbox or audit-log repositories. */
function outboxApplicability(repoFile: string): 'n/a-sink' | 'applicable' {
  return /[/\\]infrastructure[/\\](outbox|audit)[/\\]/.test(repoFile) ? 'n/a-sink' : 'applicable';
}

function isOutboxWired(repoFile: string, allFiles: string[]): boolean {
  const modulesMarker = `${path.sep}modules${path.sep}`;
  const modulesIdx = repoFile.indexOf(modulesMarker);
  // Domain module repo (modules/<name>/...): scope the search to that module's own tree.
  // Infra singleton repo (infrastructure/security/...): no module tree exists, so scope
  // narrowly to its own directory rather than the whole src tree (which would match
  // unrelated modules' outbox publishers and produce a false positive).
  const scopeRoot =
    modulesIdx !== -1
      ? repoFile.slice(0, modulesIdx + modulesMarker.length) + repoFile.slice(modulesIdx + modulesMarker.length).split(path.sep)[0]
      : path.dirname(repoFile);
  const inTree = allFiles.filter((f) => f.startsWith(scopeRoot));
  return inTree.some(
    (f) =>
      /outbox-publisher/i.test(f) ||
      (/\.module\.ts$/.test(f) && /OutboxPublisher|EVENT_PUBLISHER/.test(fs.readFileSync(f, 'utf8'))),
  );
}

function usesTransaction(content: string): boolean {
  return /startSession\(|withTransaction\(/.test(content);
}

function findLeaks(allFiles: string[]): string[] {
  const leaks: string[] = [];
  for (const f of allFiles) {
    if (!/\.ts$/.test(f) || /\.repository\.ts$/.test(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    if (/@InjectModel\(/.test(content)) leaks.push(f);
  }
  return leaks;
}

function rel(p: string): string {
  return path.relative(path.join(__dirname, '..'), p).replace(/\\/g, '/');
}

function main() {
  const allFiles = walk(SRC_ROOT);
  const repoFiles = findRepositoryFiles(allFiles);
  const reports: RepositoryReport[] = [];

  for (const file of repoFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const mongoBacked = /@InjectModel\(/.test(content);
    const methods = extractMethods(content);
    const cat = categorize(methods);
    const schemaFile = findSchemaFile(file, allFiles);
    const indexedFields = schemaFile ? extractIndexedFields(fs.readFileSync(schemaFile, 'utf8')) : [];

    reports.push({
      file,
      mongoBacked,
      methods,
      ...cat,
      usesTransaction: usesTransaction(content),
      schemaFile,
      indexedFields,
      outboxWired: mongoBacked ? isOutboxWired(file, allFiles) : false,
      outboxApplicable: outboxApplicability(file) === 'applicable',
    });
  }

  const leaks = findLeaks(allFiles);

  const lines: string[] = [];
  lines.push('# Persistence Health Report (auto-generated)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: \`Apps/ai-backend/scripts/audit-persistence.ts\` — regex-based heuristics, not a type checker. Treat PARTIAL/narrow flags as prompts for manual review, not final verdicts.`);
  lines.push('');
  lines.push('| Repository | Mongo-backed | Create | Update | Delete | FindById | Filter query | Indexes | Outbox wired | Transaction |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');

  for (const r of reports) {
    const filterCell = r.unfilteredFindAll
      ? '⚠ unfiltered (full scan)'
      : !r.hasFilterQuery
        ? '✘'
        : r.narrowQueryOnly
          ? '⚠ narrow'
          : '✔';
    const outboxCell = !r.mongoBacked ? 'n/a' : !r.outboxApplicable ? 'n/a (is sink)' : r.outboxWired ? '✔' : '✘';
    lines.push(
      `| ${rel(r.file)} | ${r.mongoBacked ? '✔' : '✘ (not Mongo)'} | ${r.hasCreate ? '✔' : '✘'} | ${r.hasUpdate ? '✔' : '✘'} | ${r.hasDelete ? '✔' : '✘'} | ${r.hasFindById ? '✔' : '✘'} | ${filterCell} | ${r.indexedFields.length ? r.indexedFields.join(', ') : '✘ none found'} | ${outboxCell} | ${r.usesTransaction ? '✔' : '✘'} |`,
    );
  }

  lines.push('');
  lines.push('## Raw-Mongo-outside-repository leak scan');
  lines.push('');
  if (leaks.length === 0) {
    lines.push('None found — every `@InjectModel(` usage is confined to a `*.repository.ts` file.');
  } else {
    for (const l of leaks) lines.push(`- ${rel(l)}`);
  }

  const report = lines.join('\n') + '\n';
  const outPath = path.join(__dirname, '../../../Docs/06_Database/PersistenceHealthReport.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report);
  console.log(report);
  console.log(`Written to ${outPath}`);
}

main();
