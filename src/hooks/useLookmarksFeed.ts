import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { use$ } from 'applesauce-react/hooks';
import { createTimelineLoader } from 'applesauce-loaders/loaders';
import type { NostrEvent } from 'nostr-tools';
import type { Subscription } from 'rxjs';

import { addressLoader, eventLoader, eventStore, pool } from '@/nostr/core';
import { SEARCH_RELAYS } from '@/nostr/relays';
import {
  EYES_EMOJI,
  getTargetPointer,
  isLookmark,
  targetKey,
  type LookmarkedEvent,
  type TargetPointer,
} from '@/nostr/lookmarks';

const PAGE_SIZE = 100;

export interface LookmarksFeed {
  /** Lookmarked events grouped by target, newest lookmark first. */
  lookmarks: LookmarkedEvent[];
  /** First page is loading and nothing is shown yet. */
  loading: boolean;
  /** An additional page is loading. */
  loadingMore: boolean;
  /** Whether another page might be available. */
  hasMore: boolean;
  /** The last load failed. */
  error: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/** Groups lookmark events by the target they point at, resolving targets from the store. */
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
 * Discovers 👀 lookmarks via NIP-50 search relays and resolves the events they
 * point at using applesauce loaders (relay hints + general + lookup relays), so
 * targets are found no matter which relay they live on. Pass a pubkey to show
 * only that user's lookmarks.
 */
export function useLookmarksFeed(pubkey?: string): LookmarksFeed {
  const [epoch, setEpoch] = useState(0);

  const loader = useMemo(
    () =>
      createTimelineLoader(
        pool,
        SEARCH_RELAYS,
        [
          { kinds: [1], search: EYES_EMOJI },
          { kinds: [7], search: EYES_EMOJI },
        ],
        { eventStore, limit: PAGE_SIZE },
      ),
    // Recreated only on refresh; the author filter is applied client-side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [epoch],
  );

  const [lookmarkEvents, setLookmarkEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);

  const seenLookmarks = useRef<Set<string>>(new Set());
  const requestedTargets = useRef<Set<string>>(new Set());
  const activeSubs = useRef<Subscription[]>([]);
  const runningRef = useRef(false);

  // Re-render as the store changes so newly resolved targets appear in the feed.
  const lastInsert = use$(() => eventStore.insert$, []);

  const resolveTarget = useCallback((lm: NostrEvent) => {
    const pointer = getTargetPointer(lm);
    if (!pointer) return;

    const key = targetKey(pointer);
    if (requestedTargets.current.has(key)) return;

    if (pointer.type === 'event') {
      if (eventStore.hasEvent(pointer.id)) return;
      requestedTargets.current.add(key);
      activeSubs.current.push(
        eventLoader({ id: pointer.id, relays: pointer.relays }).subscribe({ error: () => {} }),
      );
    } else {
      if (eventStore.hasReplaceable(pointer.kind, pointer.pubkey, pointer.identifier)) return;
      requestedTargets.current.add(key);
      activeSubs.current.push(
        addressLoader({
          kind: pointer.kind,
          pubkey: pointer.pubkey,
          identifier: pointer.identifier,
          relays: pointer.relays,
        }).subscribe({ error: () => {} }),
      );
    }
  }, []);

  const runLoad = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    setError(false);
    setLoadingMore(seenLookmarks.current.size > 0);

    let raw = 0;
    const sub = loader().subscribe({
      next: (event) => {
        raw += 1;
        if (!isLookmark(event, pubkey)) return;
        if (seenLookmarks.current.has(event.id)) return;
        seenLookmarks.current.add(event.id);
        setLookmarkEvents((prev) => [...prev, event]);
        resolveTarget(event);
      },
      complete: () => {
        runningRef.current = false;
        setLoading(false);
        setLoadingMore(false);
        if (raw === 0) setHasMore(false);
      },
      error: () => {
        runningRef.current = false;
        setLoading(false);
        setLoadingMore(false);
        setError(true);
      },
    });
    activeSubs.current.push(sub);
  }, [loader, pubkey, resolveTarget]);

  // Reset state and load the first page when the loader or target user changes.
  useEffect(() => {
    seenLookmarks.current = new Set();
    requestedTargets.current = new Set();
    runningRef.current = false;
    setLookmarkEvents([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(false);
    runLoad();

    return () => {
      for (const s of activeSubs.current) s.unsubscribe();
      activeSubs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, pubkey]);

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

  return { lookmarks, loading, loadingMore, hasMore, error, loadMore, refresh };
}
