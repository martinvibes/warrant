/**
 * Tiny API client + request log store.
 * All fetches that go through `apiCall` are recorded so the terminal
 * Logs/Network tabs can show real traffic.
 */

// Default to prod so the Vercel build works even if VITE_API_URL isn't set
// in the build environment. Override locally via .env.local for dev.
export const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://api.0gent.xyz';

export interface RequestLog {
  id: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: number;
  ok: boolean;
}

const listeners = new Set<() => void>();
const logs: RequestLog[] = [];
let nextId = 1;

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn());
}

export function getLogs(): readonly RequestLog[] {
  return logs;
}

export function clearLogs(): void {
  logs.length = 0;
  notify();
}

export async function apiCall<T = any>(
  method: string,
  path: string,
  init?: RequestInit
): Promise<{ status: number; data: T | null }> {
  const start = performance.now();
  let status = 0;
  let data: T | null = null;
  try {
    const res = await fetch(API_URL + path, { method, ...init });
    status = res.status;
    const text = await res.text();
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
  } catch (err) {
    status = 0;
  } finally {
    const durationMs = Math.round(performance.now() - start);
    logs.unshift({
      id: nextId++,
      method,
      path,
      status,
      durationMs,
      timestamp: Date.now(),
      ok: status >= 200 && status < 400,
    });
    if (logs.length > 200) logs.length = 200;
    notify();
  }
  return { status, data };
}

export function summary() {
  const now = Date.now();
  const last60 = logs.filter(l => now - l.timestamp <= 60_000);
  const okCount = last60.filter(l => l.ok).length;
  const totalCount = last60.length;
  const avgLatency = totalCount > 0
    ? Math.round(last60.reduce((s, l) => s + l.durationMs, 0) / totalCount)
    : 0;
  const uptime = totalCount > 0 ? (okCount / totalCount) * 100 : 100;
  // Bucket by 2s windows for the bar chart (30 buckets = 60s)
  const buckets = new Array(30).fill(0);
  for (const l of last60) {
    const ageSec = (now - l.timestamp) / 1000;
    const idx = 29 - Math.floor(ageSec / 2);
    if (idx >= 0 && idx < 30) buckets[idx]++;
  }
  return {
    requestsPerMin: totalCount,
    avgLatency,
    uptime,
    buckets,
  };
}
