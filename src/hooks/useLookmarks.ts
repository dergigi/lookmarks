import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

const EYES_EMOJI = '👀';

/** A lookmarked event with metadata about how it was lookmarked */
export interface LookmarkedEvent {
  /** The original event that was lookmarked */
  event: NostrEvent;
  /** The lookmark events (reactions, replies, quotes) */
  lookmarks: NostrEvent[];
  /** Most recent lookmark timestamp */
  latestLookmarkAt: number;
}

/**
 * Hook to fetch events that have been "lookmarked" with the 👀 emoji.
 * Looks for:
 * - Kind 7 reactions with 👀 content
 * - Kind 1 replies that are just 👀
 * - Kind 1 quotes (with q tag) that are just 👀
 */
export function useLookmarks(pubkey?: string) {
  const { nostr } = useNostr();

  return useQuery<LookmarkedEvent[]>({
    queryKey: ['lookmarks', pubkey ?? 'global'],
    queryFn: async ({ signal }) => {
      const timeout = AbortSignal.timeout(8000);
      const combinedSignal = AbortSignal.any([signal, timeout]);

      // Build author filter if pubkey provided
      const authorFilter = pubkey ? { authors: [pubkey] } : {};

      // Query for eyes reactions (kind 7) and potential eyes replies/quotes (kind 1)
      const lookmarkEvents = await nostr.query(
        [
          // Kind 7 reactions - we'll filter for 👀 content client-side
          { kinds: [7], ...authorFilter, limit: 200 },
          // Kind 1 notes that might be eyes-only replies or quotes
          { kinds: [1], ...authorFilter, limit: 200 },
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
        return [];
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

      return results;
    },
    staleTime: 60000, // 1 minute
  });
}
