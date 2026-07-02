/** Relays used across the app. Lookmarks is anonymous and read-only. */

/**
 * High-volume general relays used to discover 👀 reactions (kind 7) as a
 * firehose. We pull recent reactions and keep only the 👀 ones client-side,
 * so no NIP-50 search support is required.
 */
export const DISCOVERY_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.ditto.pub',
];

/** General relays used to resolve target events and as an outbox fallback. */
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.ditto.pub',
  'wss://relay.nostr.band',
];

/** Fallback lookup relays for replaceable events (profiles, NIP-65 mailboxes). */
export const LOOKUP_RELAYS = [
  'wss://purplepag.es',
  'wss://index.hzrd149.com',
];

/** Returns the hostname of a relay URL for display. */
export function relayHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
