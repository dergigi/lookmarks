import { EventStore } from 'applesauce-core';
import { RelayPool } from 'applesauce-relay';
import { createAddressLoader, createEventLoader } from 'applesauce-loaders/loaders';
import { verifyEvent } from 'nostr-tools';
import { map, type Observable } from 'rxjs';

import { DEFAULT_RELAYS, LOOKUP_RELAYS } from './relays';

/** Single reactive event store for the whole app. */
export const eventStore = new EventStore();
eventStore.verifyEvent = verifyEvent;

/** Single relay pool for all connections. */
export const pool = new RelayPool();

/** Loads events by id, following relay hints and falling back to general relays. */
export const eventLoader = createEventLoader(pool, {
  eventStore,
  extraRelays: DEFAULT_RELAYS,
});

/** Loads replaceable/addressable events (profiles, articles, ...) with lookup fallback. */
export const addressLoader = createAddressLoader(pool, {
  eventStore,
  extraRelays: DEFAULT_RELAYS,
  lookupRelays: LOOKUP_RELAYS,
});

// Fallback loader so subscriptions like eventStore.profile() / eventStore.event()
// automatically fetch from the network when the event isn't in the store yet.
eventStore.eventLoader = (pointer) =>
  'id' in pointer ? eventLoader(pointer) : addressLoader(pointer);

/**
 * A user's NIP-65 outbox (write) relays. Subscribing triggers a kind 10002
 * fetch via the fallback loader. Emits [] until the mailbox list is known.
 */
export function userOutboxes(pubkey: string): Observable<string[]> {
  return eventStore.mailboxes(pubkey).pipe(map((m) => m?.outboxes ?? []));
}
