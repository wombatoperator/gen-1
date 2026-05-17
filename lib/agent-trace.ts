import { AsyncLocalStorage } from 'node:async_hooks';

type TraceContext = {
  requestId: string;
  startedAt: number;
};

const traceStore = new AsyncLocalStorage<TraceContext>();

export function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function withAgentTrace<T>(requestId: string, fn: () => T): T {
  return traceStore.run({ requestId, startedAt: Date.now() }, fn);
}

export function traceEvent(event: string, data: Record<string, unknown> = {}): void {
  const context = traceStore.getStore();
  const payload = {
    event,
    requestId: context?.requestId ?? 'unknown',
    elapsedMs: context ? Date.now() - context.startedAt : undefined,
    ...data,
  };

  console.log(`[agent-trace] ${event}`, payload);
}
