import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { use$ } from 'applesauce-react/hooks';
import type { Filter, NostrEvent } from 'nostr-tools';
import { filter as rxFilter, take, timeout, type Subscription } from 'rxjs';

import { addressLoader, eventLoader, eventStore, pool, userOutboxes } from '@/nostr/core';
import { DEFAULT_RELAYS, DISCOVERY_RELAYS } from '@/nostr/relays';
import {
  getTargetPointer,
  isLookmark,
  targetKey,
  type LookmarkedEvent,
  type TargetPointer,
} from '@/nostr/lookmarks';

const GLOBAL_LIMIT = 400;
const PROFILE_LIMIT = 150;
const OUTBOX_WAIT_MS = 4000;

export interface LookmarksFeed {
  /** Lookmarked events grouped by target, newest reaction first. */
  lookmarks: LookmarkedEvent[];
  /** First page is loading and nothing is shown yet. */
  loading: boolean;
  /** An additional page is loading. */
  loadingMore: boolean;
  /** Whether another page might be available. */
  hasMore: boolean;
  /** The last load failed. */
  error: boolean;
  /** Relays currently being read from (firehose, or the user's outbox). */
  relays: string[];
  loadMore: () => void;
  refresh: () => void;
}

/** Groups reactions by the target they point at, resolving targets from the store. */
function buildGroups(lookmarkEvents: NostrEvent[]): LookmarkedEvent[] {
  const byTarget = new Map<string, { pointer: TargetPointer; lookmarks: NostrEvent[] }>();

  for (const lm of lookmarkEvents) {
    const pointer = getTargetPointer(lm);
    if (!pointer) continue;
    const key = targetKey(pointer);
    const entry = byTarget.get(key);
    if (entry) entry.lookmarks.push(lm);
    else byTarget.set(key, { pointer, lookmarks: [lm] });
  }

  const results: LookmarkedEvent[] = [];
  for (const { pointer, lookmarks } of byTarget.values()) {
    const target =
      pointer.type === 'event'
        ? eventStore.getEvent(pointer.id)
        : eventStore.getReplaceable(pointer.kind, pointer.pubkey, pointer.identifier);
    if (!target) continue;
    const latestLookmarkAt = Math.max(...lookmarks.map((l) => l.created_at));
    results.push({ event: target, lookmarks, latestLookmarkAt });
  }

  results.sort((a, b) => b.latestLookmarkAt - a.latestLookmarkAt);
  return results;
}

/**
 * Discovers 👀 reactions (kind 7) and resolves the events they point at.
 *
 * - Global feed: a firehose of recent reactions from {@link DISCOVERY_RELAYS},
 *   filtered to 👀 client-side (no NIP-50 search needed).
 * - Profile feed (`pubkey`): the user's reactions read from their NIP-65 outbox
 *   relays, falling back to general relays if no relay list is published.
 *
 * Targets are resolved via loaders using relay hints, general relays, and the
 * target author's outbox relays, so notes are found wherever they live.
 */
export function useLookmarksFeed(pubkey?: string): LookmarksFeed {
  const [epoch, setEpoch] = useState(0);
  const [lookmarkEvents, setLookmarkEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [relays, setRelays] = useState<string[]>(pubkey ? [] : DISCOVERY_RELAYS);

  const seenLookmarks = useRef<Set<string>>(new Set());
  const requestedTargets = useRef<Set<string>>(new Set());
  const requestedOutbox = useRef<Set<string>>(new Set());
  const activeSubs = useRef<Subscription[]>([]);
  const runningRef = useRef(false);
  const oldestRef = useRef<number | undefined>(undefined);
  const relaysRef = useRef<string[]>(pubkey ? [] : DISCOVERY_RELAYS);

  // Re-render as the store changes so newly resolved targets appear in the feed.
  const lastInsert = use$(() => eventStore.insert$, []);

  // Route a load through the target author's outbox relays once known.
  const routeOutbox = useCallback((author: string, use: (relays: string[]) => void) => {
    if (requestedOutbox.current.has(author)) return;
    requestedOutbox.current.add(author);
    activeSubs.current.push(
      userOutboxes(author)
        .pipe(rxFilter((r) => r.length > 0), take(1), timeout({ first: 8000 }))
        .subscribe({ next: use, error: () => {} }),
    );
  }, []);

  const resolveTarget = useCallback(
    (reaction: NostrEvent) => {
      const pointer = getTargetPointer(reaction);
      if (!pointer) return;

      const key = targetKey(pointer);
      if (requestedTargets.current.has(key)) return;
      requestedTargets.current.add(key);

      if (pointer.type === 'event') {
        if (eventStore.hasEvent(pointer.id)) return;
        activeSubs.current.push(
          eventLoader({ id: pointer.id, relays: pointer.relays }).subscribe({ error: () => {} }),
        );
        if (pointer.author) {
          routeOutbox(pointer.author, (outboxes) => {
            if (!eventStore.hasEvent(pointer.id)) {
              activeSubs.current.push(
                eventLoader({ id: pointer.id, relays: outboxes }).subscribe({ error: () => {} }),
              );
            }
          });
        }
      } else {
        if (eventStore.hasReplaceable(pointer.kind, pointer.pubkey, pointer.identifier)) return;
        activeSubs.current.push(
          addressLoader({
            kind: pointer.kind,
            pubkey: pointer.pubkey,
            identifier: pointer.identifier,
            relays: pointer.relays,
          }).subscribe({ error: () => {} }),
        );
      }
    },
    [routeOutbox],
  );

  const runLoad = useCallback(
    (until?: number) => {
      if (runningRef.current || relaysRef.current.length === 0) return;
      runningRef.current = true;

      setError(false);
      setLoadingMore(seenLookmarks.current.size > 0);

      const filters: Filter = {
        kinds: [7],
        limit: pubkey ? PROFILE_LIMIT : GLOBAL_LIMIT,
      };
      if (pubkey) filters.authors = [pubkey];
      if (until !== undefined) filters.until = until;

      let raw = 0;
      const finish = () => {
        runningRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      };

      const sub = pool.request(relaysRef.current, filters, { eventStore }).subscribe({
        next: (event) => {
          raw += 1;
          if (oldestRef.current === undefined || event.created_at < oldestRef.current) {
            oldestRef.current = event.created_at;
          }
          if (!isLookmark(event, pubkey)) return;
          if (seenLookmarks.current.has(event.id)) return;
          seenLookmarks.current.add(event.id);
          setLookmarkEvents((prev) => [...prev, event]);
          resolveTarget(event);
        },
        complete: () => {
          finish();
          if (raw === 0) setHasMore(false);
        },
        error: () => {
          finish();
          setError(true);
        },
      });
      activeSubs.current.push(sub);
    },
    [pubkey, resolveTarget],
  );

  // Reset state and load the first page when the target user changes or on refresh.
  useEffect(() => {
    seenLookmarks.current = new Set();
    requestedTargets.current = new Set();
    requestedOutbox.current = new Set();
    oldestRef.current = undefined;
    runningRef.current = false;
    setLookmarkEvents([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(false);

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (!pubkey) {
      relaysRef.current = DISCOVERY_RELAYS;
      setRelays(DISCOVERY_RELAYS);
      runLoad();
    } else {
      relaysRef.current = [];
      setRelays([]);
      let settled = false;
      const start = (r: string[]) => {
        if (settled) return;
        settled = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        relaysRef.current = r;
        setRelays(r);
        runLoad();
      };
      activeSubs.current.push(
        userOutboxes(pubkey).subscribe((r) => {
          if (r.length > 0) start(r);
        }),
      );
      fallbackTimer = setTimeout(() => start(DEFAULT_RELAYS), OUTBOX_WAIT_MS);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      for (const s of activeSubs.current) s.unsubscribe();
      activeSubs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubkey, epoch]);

  const lookmarks = useMemo(
    () => buildGroups(lookmarkEvents),
    // lastInsert forces a recompute as targets resolve into the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookmarkEvents, lastInsert],
  );

  const loadMore = useCallback(() => {
    if (!hasMore || runningRef.current) return;
    const until = oldestRef.current !== undefined ? oldestRef.current - 1 : undefined;
    runLoad(until);
  }, [hasMore, runLoad]);

  const refresh = useCallback(() => setEpoch((e) => e + 1), []);

  return { lookmarks, loading, loadingMore, hasMore, error, relays, loadMore, refresh };
}
