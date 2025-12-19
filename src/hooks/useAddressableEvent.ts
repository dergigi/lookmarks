import type { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useAddressableEvent(
  kind: number | undefined,
  pubkey: string | undefined,
  identifier: string | undefined,
) {
  const { nostr } = useNostr();

  return useQuery<NostrEvent | null>({
    queryKey: ['nostr', 'event', 'addr', kind ?? 0, pubkey ?? '', identifier ?? ''],
    queryFn: async ({ signal }) => {
      if (!kind || !pubkey || typeof identifier !== 'string') {
        return null;
      }

      const [event] = await nostr.query(
        [
          {
            kinds: [kind],
            authors: [pubkey],
            '#d': [identifier],
            limit: 1,
          },
        ],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) },
      );

      return event || null;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!kind && !!pubkey && typeof identifier === 'string',
  });
}


