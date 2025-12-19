/**
 * Hardcoded list of search relays that support NIP-50 search functionality.
 * These relays are used for discovering lookmark events via content search.
 * Always read-only - never publish to these.
 */
export const SEARCH_RELAY_URLS = [
  'wss://relay.nostr.band',
  'wss://relay.ditto.pub',
  'wss://search.nos.today',
];

/**
 * Trusted fallback relays used when user's relays don't have the data.
 * These provide a safety net for target resolution when user has an
 * obscure relay list. Always read-only - never publish to these.
 */
export const FALLBACK_RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

/**
 * Default relays for new/logged-out users.
 * These have both read and write enabled.
 */
export const DEFAULT_RELAY_URLS = [
  'wss://relay.ditto.pub',
  'wss://relay.nostr.band',
  'wss://relay.damus.io',
];

