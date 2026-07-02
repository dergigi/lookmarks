/** Relays used across the app. Lookmarks is anonymous and read-only. */

/** NIP-50 capable relays used to discover 👀 events via full-text search. */
export const SEARCH_RELAYS = [
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
  'wss://search.nos.today',
  'wss://relay.noswhere.com',
];

/** General-purpose relays used to resolve target events and profiles. */
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
  'wss://nos.lol',
];

/** Fallback lookup relays for hard-to-find replaceable events (profiles, etc.). */
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
