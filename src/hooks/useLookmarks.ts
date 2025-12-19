import { useEffect, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { SEARCH_RELAY_URLS } from '@/lib/nostrSearchRelays';
import {
  getCacheKey,
  getStaleCachedLookmarks,
  cacheLookmarks,
} from '@/lib/lookmarksCache';

const EYES_EMOJI = '👀';

// Mobile detection for adaptive timeouts and page sizes.
// Mobile connections are often slower/less reliable.
const isMobile = typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const PAGE_SIZE = isMobile ? 50 : 100; // Smaller batches on mobile for faster TTFB
const QUERY_TIMEOUT = isMobile ? 20000 : 10000; // Longer timeout on mobile (20s vs 10s)

/** Dedupe events by ID, keeping the first occurrence */
function dedupeEvents(events: NostrEvent[]): NostrEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

/** A lookmarked event with metadata about how it was lookmarked */
export interface LookmarkedEvent {
  /** The original event that was lookmarked, or null if target couldn't be resolved */
  event: NostrEvent | null;
  /** The target event ID or addressable coordinate (for display when event is null) */
  targetId: string;
  /** The lookmark events (reactions, replies, quotes) */
  lookmarks: NostrEvent[];
  /** Most recent lookmark timestamp */
  latestLookmarkAt: number;
}

/** Determines the type of a lookmark event */
export function getLookmarkType(ev: NostrEvent): 'reaction' | 'reply' | 'quote' {
  if (ev.kind === 7) return 'reaction';
  return ev.tags.some(([n]) => n === 'q') ? 'quote' : 'reply';
}

interface LookmarksPage {
  lookmarkedEvents: LookmarkedEvent[];
  oldestTimestamp: number | undefined;
}

/**
 * Checks if an event is referential (references another event via q/e/a tag).
 */
function isReferentialEvent(event: NostrEvent): boolean {
  const hasQ = event.tags.some(([name]) => name === 'q');
  const hasE = event.tags.some(([name]) => name === 'e');
  const hasA = event.tags.some(([name]) => name === 'a');
  return hasQ || hasE || hasA;
}

/**
 * Parses an 'a' tag value into its components (kind:pubkey:identifier).
 */
function parseAddressableTag(aTag: string): { kind: number; pubkey: string; identifier: string } | null {
  const parts = aTag.split(':');
  if (parts.length !== 3) return null;

  const kind = parseInt(parts[0], 10);
  if (isNaN(kind)) return null;

  return {
    kind,
    pubkey: parts[1],
    identifier: parts[2],
  };
}

// Maximum number of hint relays to try for missing event resolution.
// Caps fan-out to prevent excessive outbound connections from malicious hints.
const MAX_HINT_RELAYS = 5;

/**
 * Validates a relay URL is a proper WebSocket URL.
 * Only allows wss:// and ws:// schemes to prevent arbitrary outbound requests.
 */
function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
  } catch {
    return false;
  }
}

/**
 * Hook to fetch events that have been "lookmarked" with the 👀 emoji.
 * Uses NIP-50 search relays to discover kind:1 events containing 👀,
 * filters to referential-only (must reference another event),
 * and resolves targets including addressable events.
 *
 * Uses infinite query for pagination with "Load more" support.
 * Implements stale-while-revalidate via IndexedDB for instant first paint.
 */
export function useLookmarks(pubkey?: string) {
  const { nostr } = useNostr();

  // Load cached data for instant first paint (stale-while-revalidate)
  const [cachedFirstPage, setCachedFirstPage] = useState<LookmarkedEvent[] | null>(null);
  useEffect(() => {
    const cacheKey = getCacheKey(pubkey);
    getStaleCachedLookmarks<LookmarkedEvent>(cacheKey).then((result) => {
      if (result) setCachedFirstPage(result.data);
    });
  }, [pubkey]);

  const query = useInfiniteQuery<LookmarksPage>({
    queryKey: ['nostr', 'lookmarks', pubkey ?? 'global'],
    queryFn: async ({ pageParam, signal }) => {
      const timeout = AbortSignal.timeout(QUERY_TIMEOUT);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      // Build author filter if pubkey provided
      const authorFilter = pubkey ? { authors: [pubkey] } : {};
      
      // Build until filter for pagination
      const untilFilter = pageParam ? { until: pageParam as number } : {};

      // NIP-50 search filter for kind:1 events containing 👀.
      // NOTE: many NIP-50 relays behave inconsistently when combining `search`
      // with other filter fields like `authors`. We fetch broadly here and
      // apply the author filter client-side below when `pubkey` is provided.
      const searchFilter = {
        kinds: [1] as number[],
        search: EYES_EMOJI,
        ...untilFilter,
        limit: PAGE_SIZE,
      };

      // Query each NIP-50 search relay independently in parallel.
      // This way if one relay is slow/down, results from others still appear quickly.
      // Also run kind:7 reaction scan in parallel for maximum coverage.
      const searchPromises = SEARCH_RELAY_URLS.map(async (url) => {
        if (typeof nostr.group !== 'function') return [];
        try {
          const relay = nostr.group([url]);
          return await relay.query([searchFilter], { signal: combinedSignal });
        } catch (error) {
          console.warn(`Search relay ${url} failed:`, error);
          return [];
        }
      });

      // Kind:7 reaction scan on user's read relays (parallel with search).
      // This catches 👀 reactions that NIP-50 search might miss.
      const reactionPromise = nostr.query(
        [{ kinds: [7], ...authorFilter, ...untilFilter, limit: PAGE_SIZE }],
        { signal: combinedSignal }
      ).catch((error) => {
        console.warn('Reaction scan failed:', error);
        return [] as NostrEvent[];
      });

      // Wait for all queries to settle, merge successful results.
      const [searchSettled, reactionResults] = await Promise.all([
        Promise.allSettled(searchPromises),
        reactionPromise,
      ]);

      // Merge search results from all relays that responded.
      let searchResults = dedupeEvents(
        searchSettled
          .filter((r): r is PromiseFulfilledResult<NostrEvent[]> => r.status === 'fulfilled')
          .flatMap((r) => r.value)
      );

      // NIP-01 fallback: if all NIP-50 search relays failed or returned nothing,
      // query the user's read relays for kind:1 events and filter client-side.
      // This ensures lookmarks still appear even when search relays are down.
      if (searchResults.length === 0) {
        try {
          const fallbackResults = await nostr.query(
            [{ kinds: [1], ...authorFilter, ...untilFilter, limit: PAGE_SIZE }],
            { signal: combinedSignal }
          );
          // Filter client-side for events containing 👀
          searchResults = fallbackResults.filter((event) =>
            event.content.includes(EYES_EMOJI)
          );
        } catch (error) {
          console.warn('NIP-01 fallback query failed:', error);
        }
      }

      // Filter search results to referential lookmarks.
      const referentialLookmarks = searchResults.filter((event) => {
        if (event.kind !== 1) return false;
        if (pubkey && event.pubkey !== pubkey) return false;
        if (!event.content.includes(EYES_EMOJI)) return false;
        return isReferentialEvent(event);
      });

      // Filter reactions to those containing 👀.
      const reactionLookmarks = reactionResults.filter((event) => {
        return event.kind === 7 && event.content.includes(EYES_EMOJI);
      });

      // Combine and dedupe all lookmark events.
      const allLookmarkEvents = dedupeEvents([...referentialLookmarks, ...reactionLookmarks]);

      // Track oldest timestamp for pagination
      let oldestTimestamp: number | undefined;
      for (const event of allLookmarkEvents) {
        if (oldestTimestamp === undefined || event.created_at < oldestTimestamp) {
          oldestTimestamp = event.created_at;
        }
      }

      // Collect all referenced targets (event IDs and addressables) along with relay hints.
      // NIP-10 specifies that the third element of 'e'/'q' tags is a relay hint URL.
      const referencedEventIds = new Set<string>();
      const relayHints = new Map<string, Set<string>>(); // eventId -> Set of relay URLs
      const referencedAddressables = new Map<string, { kind: number; pubkey: string; identifier: string; relayHint?: string }>();

      // Helper to add validated relay hints
      const addHint = (eventId: string, url: string | undefined) => {
        if (!url || !isValidRelayUrl(url)) return;
        const hints = relayHints.get(eventId) ?? new Set();
        hints.add(url);
        relayHints.set(eventId, hints);
      };

      for (const event of allLookmarkEvents) {
        if (event.kind === 7) {
          // Reactions use 'e' tag
          const eTag = event.tags.find(([name]) => name === 'e');
          if (eTag?.[1]) {
            referencedEventIds.add(eTag[1]);
            addHint(eTag[1], eTag[2]);
          }
        } else if (event.kind === 1) {
          // Check for quote ('q' tag) first
          const qTag = event.tags.find(([name]) => name === 'q');
          if (qTag?.[1]) {
            referencedEventIds.add(qTag[1]);
            addHint(qTag[1], qTag[2]);
          } else {
            // Check for addressable reference ('a' tag)
            const aTag = event.tags.find(([name]) => name === 'a');
            if (aTag?.[1]) {
              const parsed = parseAddressableTag(aTag[1]);
              if (parsed) {
                const key = `${parsed.kind}:${parsed.pubkey}:${parsed.identifier}`;
                const validHint = aTag[2] && isValidRelayUrl(aTag[2]) ? aTag[2] : undefined;
                referencedAddressables.set(key, { ...parsed, relayHint: validHint });
              }
            } else {
              // Otherwise check for reply ('e' tag with reply marker, or last 'e' tag)
              const eTags = event.tags.filter(([name]) => name === 'e');
              const replyTag = eTags.find(([, , , marker]) => marker === 'reply')
                || eTags[eTags.length - 1];
              if (replyTag?.[1]) {
                referencedEventIds.add(replyTag[1]);
                addHint(replyTag[1], replyTag[2]);
              }
            }
          }
        }
      }

      // Fetch all referenced events by ID from user's read relays first.
      const referencedEvents: NostrEvent[] = [];
      const foundIds = new Set<string>();

      if (referencedEventIds.size > 0) {
        const eventsById = await nostr.query(
          [{ ids: Array.from(referencedEventIds) }],
          { signal: combinedSignal }
        );
        for (const ev of eventsById) {
          referencedEvents.push(ev);
          foundIds.add(ev.id);
        }
      }

      // For missing events, try relay hints (NIP-10) and search relays as fallback.
      const missingIds = Array.from(referencedEventIds).filter(id => !foundIds.has(id));

      if (missingIds.length > 0 && typeof nostr.group === 'function') {
        // Collect unique hint relays for missing events, capped to prevent fan-out attacks
        const hintRelayUrls: string[] = [];
        for (const id of missingIds) {
          if (hintRelayUrls.length >= MAX_HINT_RELAYS) break;
          const hints = relayHints.get(id);
          if (hints) {
            for (const url of hints) {
              if (hintRelayUrls.length >= MAX_HINT_RELAYS) break;
              if (!hintRelayUrls.includes(url)) hintRelayUrls.push(url);
            }
          }
        }

        // Query hint relays (capped) and search relays in parallel for missing events
        const fallbackRelays = [...hintRelayUrls, ...SEARCH_RELAY_URLS];
        const fallbackPromises = fallbackRelays.map(async (url) => {
          try {
            const relay = nostr.group([url]);
            return await relay.query([{ ids: missingIds }], { signal: combinedSignal });
          } catch {
            return [];
          }
        });

        const fallbackResults = await Promise.allSettled(fallbackPromises);
        for (const result of fallbackResults) {
          if (result.status === 'fulfilled') {
            for (const ev of result.value) {
              if (!foundIds.has(ev.id)) {
                referencedEvents.push(ev);
                foundIds.add(ev.id);
              }
            }
          }
        }
      }

      // Fetch all referenced addressable events.
      // Try user's relays first, then hint relay if provided.
      const addressableQueries = Array.from(referencedAddressables.values()).map((addr) => ({
        kinds: [addr.kind] as number[],
        authors: [addr.pubkey],
        '#d': [addr.identifier],
        limit: 1,
      }));

      if (addressableQueries.length > 0) {
        const addressableEvents = await nostr.query(
          addressableQueries,
          { signal: combinedSignal }
        );
        referencedEvents.push(...addressableEvents);
      }

      // Create a map of target events
      // For regular events: key by event ID
      // For addressables: key by a-tag format (kind:pubkey:identifier)
      const eventMap = new Map<string, NostrEvent>();
      for (const event of referencedEvents) {
        eventMap.set(event.id, event);
        
        // Also index addressable events by their 'a' tag format
        if (event.tags.some(([name]) => name === 'd')) {
          const dTag = event.tags.find(([name]) => name === 'd')?.[1] ?? '';
          const aKey = `${event.kind}:${event.pubkey}:${dTag}`;
          eventMap.set(aKey, event);
        }
      }

      // Group lookmarks by their target event.
      // Keep lookmarks even if target wasn't resolved - we'll show a placeholder.
      const lookmarksByTarget = new Map<string, NostrEvent[]>();

      for (const event of allLookmarkEvents) {
        let targetKey: string | undefined;

        if (event.kind === 7) {
          const eTag = event.tags.find(([name]) => name === 'e');
          targetKey = eTag?.[1];
        } else if (event.kind === 1) {
          const qTag = event.tags.find(([name]) => name === 'q');
          if (qTag?.[1]) {
            targetKey = qTag[1];
          } else {
            const aTag = event.tags.find(([name]) => name === 'a');
            if (aTag?.[1]) {
              targetKey = aTag[1]; // Use a-tag format as key
            } else {
              const eTags = event.tags.filter(([name]) => name === 'e');
              const replyTag = eTags.find(([, , , marker]) => marker === 'reply')
                || eTags[eTags.length - 1];
              targetKey = replyTag?.[1];
            }
          }
        }

        // Always group by targetKey, even if target event wasn't resolved.
        // This prevents empty feeds when search relays return lookmarks
        // but the target events live on different relays.
        if (!targetKey) continue;

        const existing = lookmarksByTarget.get(targetKey) || [];
        existing.push(event);
        lookmarksByTarget.set(targetKey, existing);
      }

      // Build result array.
      // Include lookmarks even when target is missing (event will be null).
      const results: LookmarkedEvent[] = [];

      for (const [targetKey, lookmarks] of lookmarksByTarget) {
        const event = eventMap.get(targetKey) ?? null;
        const latestLookmarkAt = Math.max(...lookmarks.map(l => l.created_at));
        results.push({
          event,
          targetId: targetKey,
          lookmarks,
          latestLookmarkAt,
        });
      }

      // Sort by most recent lookmark
      results.sort((a, b) => b.latestLookmarkAt - a.latestLookmarkAt);

      // Determine if there are more pages.
      // We got a full page if either search or reaction scan hit the limit.
      const hasMorePages = searchResults.length >= PAGE_SIZE ||
        reactionLookmarks.length >= PAGE_SIZE;

      // Cache first page results for stale-while-revalidate on next visit
      if (!pageParam && results.length > 0) {
        const cacheKey = getCacheKey(pubkey);
        cacheLookmarks(cacheKey, results).catch(() => {
          // Ignore cache write failures
        });
      }

      return {
        lookmarkedEvents: results,
        oldestTimestamp: hasMorePages && oldestTimestamp ? oldestTimestamp : undefined,
      };
    },
    getNextPageParam: (lastPage) => {
      // Return undefined if no more pages (will set hasNextPage to false)
      if (!lastPage.oldestTimestamp) return undefined;
      // Subtract 1 since 'until' is inclusive
      return lastPage.oldestTimestamp - 1;
    },
    initialPageParam: undefined,
    staleTime: 60000, // 1 minute
    // Use cached data as placeholder while fetching fresh data
    placeholderData: cachedFirstPage
      ? {
          pages: [{ lookmarkedEvents: cachedFirstPage, oldestTimestamp: undefined }],
          pageParams: [undefined],
        }
      : undefined,
  });

  return query;
}
