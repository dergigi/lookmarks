import { type NostrEvent } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch a single Nostr event by its ID.
 */
export function useEvent(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent | null>({
    queryKey: ['nostr', 'event', eventId ?? ''],
    queryFn: async ({ signal }) => {
      if (!eventId) {
        return null;
      }

      const [event] = await nostr.query(
        [{ ids: [eventId], limit: 1 }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) },
      );

      return event || null;
    },
    staleTime: 5 * 60 * 1000, // Keep cached data fresh for 5 minutes
    retry: 2,
    enabled: !!eventId,
  });
}

