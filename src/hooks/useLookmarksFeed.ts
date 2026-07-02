import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { use$ } from 'applesauce-react/hooks';
import type { Filter, NostrEvent } from 'nostr-tools';
import { filter as rxFilter, take, timeout, type Subscription } from 'rxjs';

import { addressLoader, eventLoader, eventStore, pool, userOutboxes } from '@/nostr/core';
import { DEFAULT_RELAYS, DISCOVERY_RELAYS, SEARCH_RELAYS } from '@/nostr/relays';
import {
  DEFAULT_EMOJI,
  getReactionEmoji,
  getTargetPointer,
  isLookmark,
  isReferentialEvent,
  targetKey,
  type LookmarkedEvent,
  type ReactionEmoji,
  type TargetPointer,
} from '@/nostr/lookmarks';

const FIREHOSE_LIMIT = 400;
const SEARCH_LIMIT = 100;
const OUTBOX_LIMIT = 150;
const OUTBOX_WAIT_MS = 4000;
const FLUSH_MS = 150;
const MAX_EMOJIS = 10;

/** A candidate stream: fixed relays plus a (possibly emoji-dependent) base filter. */
interface FeedSource {
  id: string;
  relays: string[];
  filter: () => Omit<Filter, 'until'>;
}

/** An emoji and how many reactions used it. */
export interface EmojiCount {
  emoji: ReactionEmoji;
  count: number;
}

export interface LookmarksFeed {
  lookmarks: LookmarkedEvent[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: boolean;
  relays: string[];
  /** Most-used reaction emojis, for the filter bar. */
  emojiBar: EmojiCount[];
  selectedEmoji: ReactionEmoji;
  selectEmoji: (emoji: ReactionEmoji) => void;
  loadMore: () => void;
  refresh: () => void;
}

function searchTerm(emoji: ReactionEmoji): string {
  return emoji.native ?? emoji.key;
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

/** Tallies reaction emojis, always keeping 👀 and the selected emoji present. */
function buildEmojiBar(events: NostrEvent[], selected: ReactionEmoji): EmojiCount[] {
  const counts = new Map<string, EmojiCount>();
  for (const event of events) {
    const emoji = getReactionEmoji(event);
    if (!emoji) continue;
    const existing = counts.get(emoji.key);
    if (existing) existing.count += 1;
    else counts.set(emoji.key, { emoji, count: 1 });
  }
  if (!counts.has(DEFAULT_EMOJI.key)) counts.set(DEFAULT_EMOJI.key, { emoji: DEFAULT_EMOJI, count: 0 });
  if (!counts.has(selected.key)) counts.set(selected.key, { emoji: selected, count: 0 });

  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, MAX_EMOJIS);
  if (!top.some((c) => c.emoji.key === selected.key)) {
    const sel = sorted.find((c) => c.emoji.key === selected.key);
    if (sel) top[top.length - 1] = sel;
  }
  return top;
}

/**
 * Discovers emoji lookmarks and resolves the events they point at.
 *
 * All reaction/reply/quote candidates are kept in memory so the emoji filter
 * bar can be built and switching emojis re-filters instantly. Switching emoji
 * on the global feed also re-runs the NIP-50 search for the new emoji.
 */
export function useLookmarksFeed(pubkey?: string): LookmarksFeed {
  const [epoch, setEpoch] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState<ReactionEmoji>(DEFAULT_EMOJI);
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [relays, setRelays] = useState<string[]>(pubkey ? [] : [...new Set([...DISCOVERY_RELAYS, ...SEARCH_RELAYS])]);

  const emojiRef = useRef(selectedEmoji);
  emojiRef.current = selectedEmoji;

  const seen = useRef<Set<string>>(new Set());
  const requestedTargets = useRef<Set<string>>(new Set());
  const requestedOutbox = useRef<Set<string>>(new Set());
  const activeSubs = useRef<Subscription[]>([]);
  const running = useRef<Set<string>>(new Set());
  const oldestRef = useRef<Record<string, number>>({});
  const exhaustedRef = useRef<Set<string>>(new Set());
  const sourcesRef = useRef<FeedSource[]>([]);
  const emojiInitialized = useRef(false);

  const pending = useRef<NostrEvent[]>([]);
  const flushTimer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(() => {
    if (pending.current.length === 0) return;
    const batch = pending.current;
    pending.current = [];
    setEvents((prev) => [...prev, ...batch]);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = undefined;
      flush();
    }, FLUSH_MS);
  }, [flush]);

  const lastInsert = use$(() => eventStore.insert$, []);

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
      } else if (!eventStore.hasReplaceable(pointer.kind, pointer.pubkey, pointer.identifier)) {
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

  const loadSources = useCallback(
    (ids: string[]) => {
      const sources = sourcesRef.current.filter(
        (s) => ids.includes(s.id) && !exhaustedRef.current.has(s.id) && !running.current.has(s.id),
      );
      if (sources.length === 0) return;
      for (const s of sources) running.current.add(s.id);

      setError(false);
      setLoadingMore(seen.current.size > 0);

      let pendingCount = sources.length;
      let errored = 0;
      const finish = (id: string) => {
        running.current.delete(id);
        pendingCount -= 1;
        if (pendingCount > 0) return;
        flush();
        setLoading(false);
        setLoadingMore(false);
        setHasMore(exhaustedRef.current.size < sourcesRef.current.length);
        if (errored === sources.length && seen.current.size === 0) setError(true);
      };

      for (const source of sources) {
        const until = oldestRef.current[source.id];
        const filters: Filter = { ...source.filter() };
        if (until !== undefined) filters.until = until - 1;

        let raw = 0;
        const sub = pool.request(source.relays, filters, { eventStore: null }).subscribe({
          next: (event) => {
            raw += 1;
            const prev = oldestRef.current[source.id];
            if (prev === undefined || event.created_at < prev) {
              oldestRef.current[source.id] = event.created_at;
            }
            if (event.kind === 7 || (event.kind === 1 && isReferentialEvent(event))) {
              if (!seen.current.has(event.id)) {
                seen.current.add(event.id);
                pending.current.push(event);
                scheduleFlush();
              }
            }
          },
          complete: () => {
            if (raw === 0) exhaustedRef.current.add(source.id);
            finish(source.id);
          },
          error: () => {
            errored += 1;
            finish(source.id);
          },
        });
        activeSubs.current.push(sub);
      }
    },
    [flush, scheduleFlush],
  );

  // Full reset + first load when the target user changes or on refresh.
  useEffect(() => {
    seen.current = new Set();
    requestedTargets.current = new Set();
    requestedOutbox.current = new Set();
    running.current = new Set();
    oldestRef.current = {};
    exhaustedRef.current = new Set();
    pending.current = [];
    emojiInitialized.current = false;
    setEvents([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setError(false);

    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    if (!pubkey) {
      sourcesRef.current = [
        { id: 'reactions', relays: DISCOVERY_RELAYS, filter: () => ({ kinds: [7], limit: FIREHOSE_LIMIT }) },
        {
          id: 'referential',
          relays: SEARCH_RELAYS,
          filter: () => ({ kinds: [1], search: searchTerm(emojiRef.current), limit: SEARCH_LIMIT }),
        },
      ];
      setRelays([...new Set([...DISCOVERY_RELAYS, ...SEARCH_RELAYS])]);
      loadSources(['reactions', 'referential']);
    } else {
      sourcesRef.current = [];
      setRelays([]);
      let settled = false;
      const start = (r: string[]) => {
        if (settled) return;
        settled = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        sourcesRef.current = [
          { id: 'reactions', relays: r, filter: () => ({ kinds: [7], authors: [pubkey], limit: OUTBOX_LIMIT }) },
          { id: 'notes', relays: r, filter: () => ({ kinds: [1], authors: [pubkey], limit: OUTBOX_LIMIT }) },
        ];
        setRelays(r);
        loadSources(['reactions', 'notes']);
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
      if (flushTimer.current) clearTimeout(flushTimer.current);
      for (const s of activeSubs.current) s.unsubscribe();
      activeSubs.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pubkey, epoch]);

  // On the global feed, re-fetch replies/quotes when the emoji changes.
  useEffect(() => {
    if (!emojiInitialized.current) {
      emojiInitialized.current = true;
      return;
    }
    if (pubkey) return;
    exhaustedRef.current.delete('referential');
    delete oldestRef.current['referential'];
    loadSources(['referential']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmoji]);

  const matched = useMemo(
    () => events.filter((e) => isLookmark(e, selectedEmoji, pubkey)),
    [events, selectedEmoji, pubkey],
  );

  useEffect(() => {
    for (const e of matched) resolveTarget(e);
  }, [matched, resolveTarget]);

  const lookmarks = useMemo(
    () => buildGroups(matched),
    // lastInsert forces a recompute as targets resolve into the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matched, lastInsert],
  );

  const emojiBar = useMemo(() => buildEmojiBar(events, selectedEmoji), [events, selectedEmoji]);

  const loadMore = useCallback(() => {
    if (!hasMore) return;
    loadSources(sourcesRef.current.map((s) => s.id));
  }, [hasMore, loadSources]);

  const selectEmoji = useCallback((emoji: ReactionEmoji) => setSelectedEmoji(emoji), []);
  const refresh = useCallback(() => setEpoch((e) => e + 1), []);

  return {
    lookmarks,
    loading,
    loadingMore,
    hasMore,
    error,
    relays,
    emojiBar,
    selectedEmoji,
    selectEmoji,
    loadMore,
    refresh,
  };
}
