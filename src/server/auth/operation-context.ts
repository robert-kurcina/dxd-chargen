import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
export const securityOperation = new AsyncLocalStorage<{ operationId: string; actorId: string | null }>();
