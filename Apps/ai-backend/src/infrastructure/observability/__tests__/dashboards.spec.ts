import { readFileSync } from 'fs';
import { join } from 'path';

interface DashboardPanel {
  id: number;
  title: string;
  type: string;
  targets?: { expr: string }[];
}

interface Dashboard {
  title: string;
  panels: DashboardPanel[];
}

const REQUIRED_SECTIONS = ['HTTP', 'MongoDB', 'Redis', 'BullMQ', 'Outbox', 'Goal Module'];

const KNOWN_METRICS = [
  'http_requests_total',
  'http_request_duration_seconds',
  'goal_created_total',
  'goal_completed_total',
  'mongodb_latency_ms',
  'redis_latency_ms',
  'bullmq_jobs_total',
  'bullmq_queue_delay_ms',
  'outbox_pending_total',
  'circuit_breaker_state',
  'service_dependency_up'
];

describe('Dashboard configuration', () => {
  let dashboard: Dashboard;

  beforeAll(() => {
    const raw = readFileSync(join(__dirname, '..', 'dashboards', 'ai-backend-overview.json'), 'utf-8');
    dashboard = JSON.parse(raw);
  });

  it('parses as valid JSON with a title and panels array', () => {
    expect(dashboard.title).toBeDefined();
    expect(Array.isArray(dashboard.panels)).toBe(true);
    expect(dashboard.panels.length).toBeGreaterThan(0);
  });

  it.each(REQUIRED_SECTIONS)('has a row panel titled: %s', (sectionTitle) => {
    const row = dashboard.panels.find((p) => p.type === 'row' && p.title === sectionTitle);
    expect(row).toBeDefined();
  });

  it('every panel target expr references a known metric name', () => {
    const panelsWithTargets = dashboard.panels.filter((p) => p.targets && p.targets.length > 0);
    expect(panelsWithTargets.length).toBeGreaterThan(0);

    for (const panel of panelsWithTargets) {
      for (const target of panel.targets!) {
        const referencesKnownMetric = KNOWN_METRICS.some((metric) => target.expr.includes(metric));
        expect(referencesKnownMetric).toBe(true);
      }
    }
  });
});
