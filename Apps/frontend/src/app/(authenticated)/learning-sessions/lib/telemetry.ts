export function trackWorkspaceEvent(name: string, props?: Record<string, unknown>) {
  // Fire-and-forget operational telemetry only -- never pass note or reflection content here.
  console.info("[telemetry]", name, props);
}
