import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { SEARCH_RELAY_URLS } from '@/lib/nostrSearchRelays';

/**
 * NostrSync - Syncs user's Nostr data
 *
 * This component runs globally to sync various Nostr data when the user logs in.
 * Currently syncs:
 * - NIP-65 relay list (kind 10002)
 */
export function NostrSync() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config, updateConfig } = useAppContext();

  useEffect(() => {
    if (!user) return;

    const syncRelaysFromNostr = async () => {
      try {
        const events = await nostr.query(
          [{ kinds: [10002], authors: [user.pubkey], limit: 1 }],
          { signal: AbortSignal.timeout(5000) }
        );

        if (events.length > 0) {
          const event = events[0];

          // Only update if the event is newer than our stored data
          if (event.created_at > config.relayMetadata.updatedAt) {
            const fetchedRelays = event.tags
              .filter(([name]) => name === 'r')
              .map(([_, url, marker]) => ({
                url,
                read: !marker || marker === 'read',
                write: !marker || marker === 'write',
              }));

            if (fetchedRelays.length > 0) {
              // Append search/discovery relays as read-only to ensure lookmark
              // queries work even when user has an obscure relay list.
              // NIP-50 relays are essential for content search.
              const userRelayUrls = new Set(fetchedRelays.map(r => r.url));
              const searchRelaysToAdd = SEARCH_RELAY_URLS
                .filter(url => !userRelayUrls.has(url))
                .map(url => ({ url, read: true, write: false }));

              const mergedRelays = [...fetchedRelays, ...searchRelaysToAdd];

              console.log('Syncing relay list from Nostr:', mergedRelays);
              updateConfig((current) => ({
                ...current,
                relayMetadata: {
                  relays: mergedRelays,
                  updatedAt: event.created_at,
                },
              }));
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync relays from Nostr:', error);
      }
    };

    syncRelaysFromNostr();
  }, [user, config.relayMetadata.updatedAt, nostr, updateConfig]);

  return null;
}