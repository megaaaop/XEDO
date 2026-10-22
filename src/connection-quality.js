// Dashboard thresholds, not a GEE SLA. Unknown is never represented as good.
export function connectionQuality(ms, failed = false) {
  if (failed) return 'bad';
  if (!Number.isFinite(ms) || ms < 0) return 'unknown';
  return ms < 300 ? 'good' : ms < 1000 ? 'moderate' : 'bad';
}
