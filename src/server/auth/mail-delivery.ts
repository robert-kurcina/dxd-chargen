import 'server-only';
import type { createLocalMailStore, LocalAccountMail } from './local-mail-store';

type DeliveryQueue = Pick<ReturnType<typeof createLocalMailStore>, 'claim' | 'complete' | 'retry'>;
// Resolve only after the transport accepts the message. Adapters own timeouts and
// should deduplicate by idempotencyKey; a rejected send may still have delivered.
export type MailSender = (message: { mail: LocalAccountMail; idempotencyKey: string }) => Promise<void>;

// One explicit attempt, no background loop, network adapter or public entrypoint.
export async function deliverNextMail(queue: DeliveryQueue, send: MailSender) {
  const claim = queue.claim();
  if (!claim) return { status: 'idle' as const };
  let accepted = false;
  try {
    await send({ mail: claim.mail, idempotencyKey: claim.id });
    accepted = true;
  } catch {
    // Never expose provider errors: they can contain recipient addresses or tokens.
  }
  // Keep database failures outside the sender catch. A failed acknowledgement
  // must remain recoverable, rather than being mistaken for a rejected send.
  if (accepted) {
    return { id: claim.id, status: queue.complete(claim.id, claim.token) ? 'accepted' as const : 'lease-lost' as const };
  }
  const delayMs = Math.min(300_000, 30_000 * 2 ** Math.min(claim.attempts - 1, 4));
  return { id: claim.id, status: queue.retry(claim.id, claim.token, delayMs) ? 'retry-scheduled' as const : 'lease-lost' as const };
}
