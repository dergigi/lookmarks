import { use$ } from 'applesauce-react/hooks';
import { getDisplayName, getProfilePicture } from 'applesauce-core/helpers';

import { eventStore } from '@/nostr/core';
import { genUserName } from '@/lib/genUserName';

/**
 * Reactive profile data for a pubkey. Subscribing triggers an automatic fetch
 * via the event store's fallback loader when the profile isn't cached yet.
 */
export function useProfile(pubkey?: string) {
  const profile = use$(() => (pubkey ? eventStore.profile(pubkey) : undefined), [pubkey]);

  return {
    profile,
    displayName: pubkey ? getDisplayName(profile, genUserName(pubkey)) : '',
    picture: getProfilePicture(profile),
    nip05: profile?.nip05,
  };
}
