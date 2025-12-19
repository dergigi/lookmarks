import type { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';

const EYES_EMOJI = '👀';
const PAGE_SIZE = 100;

export type LookmarkEventType = 'reaction' | 'reply' | 'quote';

export interface LookmarkEventItem {
  event: NostrEvent;
  type: LookmarkEventType;
}

interface LookmarkEventsPage {
  items: LookmarkEventItem[];
  oldestTimestamp: number | undefined;
}

function isReferentialEvent(event: NostrEvent): boolean {
  const hasQ = event.tags.some(([name]) => name === 'q');
  const hasE = event.tags.some(([name]) => name === 'e');
  const hasA = event.tags.some(([name]) => name === 'a');
  return hasQ || hasE || hasA;
}

function getLookmarkType(ev: NostrEvent): LookmarkEventType {
  if (ev.kind === 7) return 'reaction';
  return ev.tags.some(([n]) => n === 'q') ? 'quote' : 'reply';
}

function hasEyes(ev: NostrEvent): boolean {
  return typeof ev.content === 'string' && ev.content.includes(EYES_EMOJI);
}

/**
 * Fetch "👀 lookmark events authored by this user".
 *
 * We intentionally query regular relays with `authors:[pubkey]` and then
 * filter for 👀 client-side. This avoids inconsistent support for combining
 * NIP-50 `search` with `authors` across search relays.
 */
export function useLookmarkEvents(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useInfiniteQuery<LookmarkEventsPage>({
    queryKey: ['nostr', 'lookmark-events', pubkey ?? ''],
    queryFn: async ({ pageParam, signal }) => {
      if (!pubkey) {
        return { items: [], oldestTimestamp: undefined };
      }

      const until = typeof pageParam === 'number' ? pageParam : undefined;

      const timeout = AbortSignal.timeout(8000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      const filters = [
        { kinds: [1], authors: [pubkey], ...(until ? { until } : {}), limit: PAGE_SIZE },
        { kinds: [7], authors: [pubkey], ...(until ? { until } : {}), limit: PAGE_SIZE },
      ];

      const results = await nostr.query(filters, { signal: combinedSignal });

      const oldestTimestamp = results.reduce<number | undefined>((min, ev) => {
        if (typeof ev.created_at !== 'number') return min;
        if (min === undefined) return ev.created_at;
        return Math.min(min, ev.created_at);
      }, undefined);

      const kind1Lookmarks: LookmarkEventItem[] = results
        .filter((ev) => ev.kind === 1)
        .filter(hasEyes)
        .filter(isReferentialEvent)
        .map((ev) => ({ event: ev, type: getLookmarkType(ev) }));

      const kind7Lookmarks: LookmarkEventItem[] = results
        .filter((ev) => ev.kind === 7)
        .filter(hasEyes)
        // Ensure it's a reaction to something
        .filter((ev) => ev.tags.some(([name]) => name === 'e'))
        .map((ev) => ({ event: ev, type: 'reaction' as const }));

      const items = [...kind1Lookmarks, ...kind7Lookmarks].sort(
        (a, b) => b.event.created_at - a.event.created_at,
      );

      return { items, oldestTimestamp };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.oldestTimestamp) return undefined;
      return lastPage.oldestTimestamp - 1;
    },
    initialPageParam: undefined,
    staleTime: 60_000,
    enabled: !!pubkey,
  });
}


