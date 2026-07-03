import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

interface AlertRule {
  alert: string;
  expr: string;
  for?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

interface AlertGroup {
  name: string;
  rules: AlertRule[];
}

interface AlertsFile {
  groups: AlertGroup[];
}

const REQUIRED_ALERTS = [
  'RedisUnavailable',
  'MongoDisconnected',
  'BullMQStalledJobs',
  'OutboxBacklogHigh',
  'CircuitBreakerOpen',
  'HighAPILatency',
];

describe('Alert rule loading', () => {
  let parsed: AlertsFile;

  beforeAll(() => {
    const raw = readFileSync(join(__dirname, '..', 'alerts', 'ai-backend-alerts.yml'), 'utf-8');
    parsed = yaml.load(raw) as AlertsFile;
  });

  it('parses as valid YAML with at least one rule group', () => {
    expect(parsed.groups).toBeDefined();
    expect(parsed.groups.length).toBeGreaterThan(0);
  });

  it.each(REQUIRED_ALERTS)('defines the required alert: %s', (alertName) => {
    const allRules = parsed.groups.flatMap((g) => g.rules);
    const rule = allRules.find((r) => r.alert === alertName);
    expect(rule).toBeDefined();
    expect(typeof rule!.expr).toBe('string');
    expect(rule!.expr.length).toBeGreaterThan(0);
  });

  it('every rule has a severity label and a runbook annotation', () => {
    const allRules = parsed.groups.flatMap((g) => g.rules);
    for (const rule of allRules) {
      expect(rule.labels?.severity).toBeDefined();
      expect(rule.annotations?.runbook).toContain('ObservabilityRunbook.md');
    }
  });
});
