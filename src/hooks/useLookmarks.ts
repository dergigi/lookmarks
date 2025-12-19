import { useNostr } from '@nostrify/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

const EYES_EMOJI = '👀';
const PAGE_SIZE = 100; // Number of lookmark events to fetch per page

/** A lookmarked event with metadata about how it was lookmarked */
export interface LookmarkedEvent {
  /** The original event that was lookmarked */
  event: NostrEvent;
  /** The lookmark events (reactions, replies, quotes) */
  lookmarks: NostrEvent[];
  /** Most recent lookmark timestamp */
  latestLookmarkAt: number;
}

interface LookmarksPage {
  lookmarkedEvents: LookmarkedEvent[];
  oldestTimestamp: number | undefined;
}

/**
 * Hook to fetch events that have been "lookmarked" with the 👀 emoji.
 * Looks for:
 * - Kind 7 reactions with 👀 content
 * - Kind 1 replies that are just 👀
 * - Kind 1 quotes (with q tag) that are just 👀
 * 
 * Uses infinite query for pagination with "Load more" support.
 */
export function useLookmarks(pubkey?: string) {
  const { nostr } = useNostr();

  return useInfiniteQuery<LookmarksPage>({
    queryKey: ['lookmarks', pubkey ?? 'global'],
    queryFn: async ({ pageParam, signal }) => {
      const timeout = AbortSignal.timeout(10000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      // Build author filter if pubkey provided
      const authorFilter = pubkey ? { authors: [pubkey] } : {};
      
      // Build until filter for pagination
      const untilFilter = pageParam ? { until: pageParam as number } : {};

      // Query for eyes reactions (kind 7) and potential eyes replies/quotes (kind 1)
      const lookmarkEvents = await nostr.query(
        [
          // Kind 7 reactions - we'll filter for 👀 content client-side
          { kinds: [7], ...authorFilter, ...untilFilter, limit: PAGE_SIZE },
          // Kind 1 notes that might be eyes-only replies or quotes
          { kinds: [1], ...authorFilter, ...untilFilter, limit: PAGE_SIZE },
        ],
        { signal: combinedSignal }
      );

      // Filter to only 👀 events
      const eyesEvents = lookmarkEvents.filter((event) => {
        const content = event.content.trim();
        if (event.kind === 7) {
          return content === EYES_EMOJI;
        }
        if (event.kind === 1) {
          // Only count kind 1 if it's JUST the eyes emoji (reply or quote)
          return content === EYES_EMOJI;
        }
        return false;
      });

      // Track oldest timestamp for pagination
      let oldestTimestamp: number | undefined;
      for (const event of lookmarkEvents) {
        if (oldestTimestamp === undefined || event.created_at < oldestTimestamp) {
          oldestTimestamp = event.created_at;
        }
      }

      // Collect all referenced event IDs
      const referencedIds = new Set<string>();
      
      for (const event of eyesEvents) {
        if (event.kind === 7) {
          // Reactions use 'e' tag
          const eTag = event.tags.find(([name]) => name === 'e');
          if (eTag?.[1]) {
            referencedIds.add(eTag[1]);
          }
        } else if (event.kind === 1) {
          // Check for quote ('q' tag) first
          const qTag = event.tags.find(([name]) => name === 'q');
          if (qTag?.[1]) {
            referencedIds.add(qTag[1]);
          } else {
            // Otherwise check for reply ('e' tag with reply marker, or last 'e' tag)
            const eTags = event.tags.filter(([name]) => name === 'e');
            const replyTag = eTags.find(([, , , marker]) => marker === 'reply') 
              || eTags[eTags.length - 1];
            if (replyTag?.[1]) {
              referencedIds.add(replyTag[1]);
            }
          }
        }
      }

      if (referencedIds.size === 0) {
        return { 
          lookmarkedEvents: [], 
          oldestTimestamp: lookmarkEvents.length < PAGE_SIZE * 2 ? undefined : oldestTimestamp 
        };
      }

      // Fetch all referenced events
      const referencedEvents = await nostr.query(
        [{ ids: Array.from(referencedIds) }],
        { signal: combinedSignal }
      );

      // Create a map of event ID to event
      const eventMap = new Map<string, NostrEvent>();
      for (const event of referencedEvents) {
        eventMap.set(event.id, event);
      }

      // Group lookmarks by their target event
      const lookmarksByTarget = new Map<string, NostrEvent[]>();
      
      for (const event of eyesEvents) {
        let targetId: string | undefined;
        
        if (event.kind === 7) {
          const eTag = event.tags.find(([name]) => name === 'e');
          targetId = eTag?.[1];
        } else if (event.kind === 1) {
          const qTag = event.tags.find(([name]) => name === 'q');
          if (qTag?.[1]) {
            targetId = qTag[1];
          } else {
            const eTags = event.tags.filter(([name]) => name === 'e');
            const replyTag = eTags.find(([, , , marker]) => marker === 'reply') 
              || eTags[eTags.length - 1];
            targetId = replyTag?.[1];
          }
        }

        if (targetId && eventMap.has(targetId)) {
          const existing = lookmarksByTarget.get(targetId) || [];
          existing.push(event);
          lookmarksByTarget.set(targetId, existing);
        }
      }

      // Build result array
      const results: LookmarkedEvent[] = [];
      
      for (const [eventId, lookmarks] of lookmarksByTarget) {
        const event = eventMap.get(eventId);
        if (event) {
          const latestLookmarkAt = Math.max(...lookmarks.map(l => l.created_at));
          results.push({
            event,
            lookmarks,
            latestLookmarkAt,
          });
        }
      }

      // Sort by most recent lookmark
      results.sort((a, b) => b.latestLookmarkAt - a.latestLookmarkAt);

      return { 
        lookmarkedEvents: results, 
        // Only provide next page if we got a full page of results
        oldestTimestamp: lookmarkEvents.length < PAGE_SIZE * 2 ? undefined : oldestTimestamp 
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
  });
}
