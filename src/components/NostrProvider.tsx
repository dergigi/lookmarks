import React, { useEffect, useRef } from 'react';
import { NostrEvent, NostrFilter, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { SEARCH_RELAY_URLS } from '@/lib/nostrSearchRelays';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayMetadata = useRef(config.relayMetadata);

  // Invalidate Nostr queries when relay metadata changes
  // All Nostr data queries use keys starting with ['nostr', ...]
  useEffect(() => {
    relayMetadata.current = config.relayMetadata;
    queryClient.invalidateQueries({ queryKey: ['nostr'] });
  }, [config.relayMetadata, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters: NostrFilter[]) {
        const routes = new Map<string, NostrFilter[]>();

        // Route to all read relays
        const readRelays = relayMetadata.current.relays
          .filter(r => r.read)
          .map(r => r.url);

        for (const url of readRelays) {
          routes.set(url, filters);
        }

        return routes;
      },
      eventRouter(_event: NostrEvent) {
        // Only write to user's relays (never to search/fallback relays)
        // For backwards compatibility, relays without source are treated as user relays
        const writeRelays = relayMetadata.current.relays
          .filter(r => r.write && (!r.source || r.source === 'user'))
          .map(r => r.url);

        return writeRelays;
      },
    });
  }

  // Pre-warm connections to search relays on mount.
  // This reduces latency for the initial lookmarks query by establishing
  // WebSocket connections before the feed component mounts.
  useEffect(() => {
    if (!pool.current || typeof pool.current.group !== 'function') return;

    // Track failed relays to avoid repeated connection storms.
    // Uses localStorage for cross-tab persistence with TTL-based expiry.
    const FAILED_RELAYS_KEY = 'lookmarks:failed-prewarm-relays';
    const FAILURE_TTL_MS = 5 * 60 * 1000; // 5 minute backoff

    let failedRelays: Record<string, number> = {};
    try {
      const stored = localStorage.getItem(FAILED_RELAYS_KEY);
      if (stored) failedRelays = JSON.parse(stored);
    } catch {
      // Ignore parse errors
    }

    const now = Date.now();
    const updatedFailures: Record<string, number> = {};

    // Create a group for each search relay to trigger connection establishment.
    // Skip relays that failed recently to avoid reconnect storms.
    for (const url of SEARCH_RELAY_URLS) {
      const lastFailure = failedRelays[url];
      if (lastFailure && now - lastFailure < FAILURE_TTL_MS) {
        // Skip this relay - still in backoff period
        updatedFailures[url] = lastFailure;
        continue;
      }

      try {
        pool.current.group([url]);
      } catch {
        // Mark relay as failed for backoff
        updatedFailures[url] = now;
      }
    }

    // Persist updated failure tracking
    try {
      if (Object.keys(updatedFailures).length > 0) {
        localStorage.setItem(FAILED_RELAYS_KEY, JSON.stringify(updatedFailures));
      } else {
        localStorage.removeItem(FAILED_RELAYS_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;