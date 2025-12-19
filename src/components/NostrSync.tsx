import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { SEARCH_RELAY_URLS, FALLBACK_RELAY_URLS } from '@/lib/nostrSearchRelays';
import type { RelayConfig } from '@/contexts/AppContext';

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
            // Parse user's relays from NIP-65, marking them with source: 'user'
            const userRelays: RelayConfig[] = event.tags
              .filter(([name]) => name === 'r')
              .map(([, url, marker]) => ({
                url,
                read: !marker || marker === 'read',
                write: !marker || marker === 'write',
                source: 'user' as const,
              }));

            if (userRelays.length > 0) {
              const userRelayUrls = new Set(userRelays.map(r => r.url));

              // Add search relays (read-only, source: 'search')
              // These are essential for NIP-50 lookmark discovery
              const searchRelays: RelayConfig[] = SEARCH_RELAY_URLS
                .filter(url => !userRelayUrls.has(url))
                .map(url => ({ url, read: true, write: false, source: 'search' as const }));

              // Add fallback relays (read-only, source: 'fallback')
              // These help resolve targets when user's relays don't have the data
              const allUrls = new Set([...userRelayUrls, ...SEARCH_RELAY_URLS]);
              const fallbackRelays: RelayConfig[] = config.relayMetadata.fallbacksDisabled
                ? []
                : FALLBACK_RELAY_URLS
                    .filter(url => !allUrls.has(url))
                    .map(url => ({ url, read: true, write: false, source: 'fallback' as const }));

              // Merge: user relays first, then search, then fallback
              // User relays keep their write permissions; system relays are read-only
              const mergedRelays = [...userRelays, ...searchRelays, ...fallbackRelays];

              console.log('Syncing relay list from Nostr:', {
                user: userRelays.length,
                search: searchRelays.length,
                fallback: fallbackRelays.length,
              });
              updateConfig((current) => ({
                ...current,
                relayMetadata: {
                  ...current.relayMetadata,
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