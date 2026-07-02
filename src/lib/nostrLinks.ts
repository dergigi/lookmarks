/** Whether a NIP-19 identifier points at a profile or an event. */
export type NostrLinkType = 'event' | 'profile';

/** Builds a njump.to URL for any NIP-19 identifier (npub, nevent, note, naddr…). */
export function njumpUrl(id: string): string {
  return `https://njump.to/${id}`;
}

/** Builds an ants.sh URL: /p/ for profiles, /e/ for events. */
export function antsUrl(id: string, type: NostrLinkType): string {
  return `https://ants.sh/${type === 'profile' ? 'p' : 'e'}/${id}`;
}

/** Builds a NIP-21 nostr: URI that opens the user's native/default client. */
export function nostrUri(id: string): string {
  return `nostr:${id}`;
}
