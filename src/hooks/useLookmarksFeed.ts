import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { use$ } from 'applesauce-react/hooks';
import type { Filter, NostrEvent } from 'nostr-tools';
import { filter as rxFilter, take, timeout, type Subscription } from 'rxjs';

import { addressLoader, eventLoader, eventStore, pool, userOutboxes } from '@/nostr/core';
import { DEFAULT_RELAYS, DISCOVERY_RELAYS, SEARCH_RELAYS } from '@/nostr/relays';
import {
  EYES_EMOJI,
  getTargetPointer,
  isLookmark,
  targetKey,
  type LookmarkedEvent,
  type TargetPointer,
} from '@/nostr/lookmarks';

const FIREHOSE_LIMIT = 400;
const SEARCH_LIMIT = 100;
const OUTBOX_LIMIT = 150;
const OUTBOX_WAIT_MS = 4000;

/** One discovery stream: a set of relays plus a base filter (paginated by `until`). */
interface FeedSource {
  id: string;
  relays: string[];
  filter: Omit<Filter, 'until'>;
}

export interface LookmarksFeed {
  /** Lookmarked events grouped by target, newest lookmark first. */
  lookmarks: LookmarkedEvent[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: boolean;
  /** Relays currently being read from. */
  relays: string[];
  loadMore: () => void;
  refresh: () => void;
}

/** Groups lookmarks by the target they point at, resolving targets from the store. */
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

/** Builds the discovery sources for the global feed. */
function globalSources(): FeedSource[] {
  return [
    { id: 'reactions', relays: DISCOVERY_RELAYS, filter: { kinds: [7], limit: FIREHOSE_LIMIT } },
    {
      id: 'referential',
      relays: SEARCH_RELAYS,
      filter: { kinds: [1], search: EYES_EMOJI, limit: SEARCH_LIMIT },
    },
  ];
}

/** Builds the discovery sources for a single user, read from their outbox relays. */
function profileSources(pubkey: string, relays: string[]): FeedSource[] {
  return [
    { id: 'reactions', relays, filter: { kinds: [7], authors: [pubkey], limit: OUTBOX_LIMIT } },
    { id: 'notes', relays, filter: { kinds: [1], authors: [pubkey], limit: OUTBOX_LIMIT } },
  ];
}

/**
 * Discovers lookmarks and resolves the events they point at.
 *
 * - Global feed: 👀 reactions from a firehose plus kind 1 reply/quote lookmarks
 *   found via NIP-50 search, merged and grouped by target.
 * - Profile feed (`pubkey`): the user's reactions and notes read from their
 *   NIP-65 outbox relays (falling back to general relays), filtered to 👀
 *   reactions and referential 👀 notes.
 *
 * Targets resolve via relay hints, general relays, and the target author's
 * outbox relays, so notes are found wherever they live.
 */
export function useLookmarksFeed(pubkey?: string): LookmarksFeed {
  const [epoch, setEpoch] = useState(0);
  const [lookmarkEvents, setLookmarkEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [relays, setRelays] = useState<string[]>(() =>
    pubkey ? [] : [...new Set([...DISCOVERY_RELAYS, ...SEARCH_RELAYS])],
  );

  const seenLookmarks = useRef<Set<string>>(new Set());
  const requestedTargets = useRef<Set<string>>(new Set());
  const requestedOutbox = useRef<Set<string>>(new Set());
  const activeSubs = useRef<Subscription[]>([]);
  const runningRef = useRef(false);
  const sourcesRef = useRef<FeedSource[]>([]);
  const oldestRef = useRef<Record<string, number>>({});
  const exhaustedRef = useRef<Set<string>>(new Set());

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
    (lookmark: NostrEvent) => {
      const pointer = getTargetPointer(lookmark);
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

  const runLoad = useCallback(() => {
    const sources = sourcesRef.current.filter((s) => !exhaustedRef.current.has(s.id));
    if (runningRef.current || sources.length === 0) return;
    runningRef.current = true;

    setError(false);
    setLoadingMore(seenLookmarks.current.size > 0);

    let pending = sources.length;
    let errored = 0;
    const finish = () => {
      pending -= 1;
      if (pending > 0) return;
      runningRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setHasMore(exhaustedRef.current.size < sourcesRef.current.length);
      if (errored === sources.length && seenLookmarks.current.size === 0) setError(true);
    };

    for (const source of sources) {
      const until = oldestRef.current[source.id];
      const filters: Filter = { ...source.filter };
      if (until !== undefined) filters.until = until - 1;

      let raw = 0;
      // Disable auto-insert: the firehose returns mostly non-👀 events we don't
      // need. We add only matched lookmarks to the store to keep it lean and
      // avoid re-render churn from insert$ firing on every discovered event.
      const sub = pool.request(source.relays, filters, { eventStore: null }).subscribe({
        next: (event) => {
          raw += 1;
          const prev = oldestRef.current[source.id];
          if (prev === undefined || event.created_at < prev) {
            oldestRef.current[source.id] = event.created_at;
          }
          if (!isLookmark(event, pubkey)) return;
          if (seenLookmarks.current.has(event.id)) return;
          seenLookmarks.current.add(event.id);
          eventStore.add(event);
          setLookmarkEvents((prevEvents) => [...prevEvents, event]);
          resolveTarget(event);
        },
        complete: () => {
          if (raw === 0) exhaustedRef.current.add(source.id);
          finish();
        },
        error: () => {
          errored += 1;
          finish();
        },
      });
      activeSubs.current.push(sub);
    }
  }, [pubkey, resolveTarget]);

  // Reset state and load the first page when the target user changes or on refresh.
  useEffect(() => {
    seenLookmarks.current = new Set();
    requestedTargets.current = new Set();
    requestedOutbox.current = new Set();
    oldestRef.current = {};
    exhaustedRef.current = new Set();
    runningRef.current = false;
    setLookmarkEvents([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(false);

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (!pubkey) {
      sourcesRef.current = globalSources();
      setRelays([...new Set([...DISCOVERY_RELAYS, ...SEARCH_RELAYS])]);
      runLoad();
    } else {
      sourcesRef.current = [];
      setRelays([]);
      let settled = false;
      const start = (r: string[]) => {
        if (settled) return;
        settled = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        sourcesRef.current = profileSources(pubkey, r);
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
    runLoad();
  }, [hasMore, runLoad]);

  const refresh = useCallback(() => setEpoch((e) => e + 1), []);

  return { lookmarks, loading, loadingMore, hasMore, error, relays, loadMore, refresh };
}
