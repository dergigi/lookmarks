import type { NostrEvent } from 'nostr-tools';

/** The emoji that marks something as worth a look. */
export const EYES_EMOJI = '👀';

/** A resolved-or-pending target that a lookmark points at. */
export type TargetPointer =
  | { type: 'event'; id: string; relays?: string[]; author?: string }
  | { type: 'address'; kind: number; pubkey: string; identifier: string; relays?: string[] };

/** A target event together with every 👀 reaction pointing at it. */
export interface LookmarkedEvent {
  /** The original event that was lookmarked. */
  event: NostrEvent;
  /** The 👀 reaction events. */
  lookmarks: NostrEvent[];
  /** Most recent reaction timestamp. */
  latestLookmarkAt: number;
}

/** A lookmark is a kind 7 reaction whose content is 👀. */
export function isLookmark(event: NostrEvent, pubkey?: string): boolean {
  if (event.kind !== 7) return false;
  if (!event.content.includes(EYES_EMOJI)) return false;
  if (pubkey && event.pubkey !== pubkey) return false;
  return true;
}

function parseAddressTag(value: string, relay?: string): TargetPointer | null {
  const [kindStr, pubkey, ...rest] = value.split(':');
  const kind = Number.parseInt(kindStr, 10);
  if (Number.isNaN(kind) || !pubkey) return null;
  return {
    type: 'address',
    kind,
    pubkey,
    identifier: rest.join(':'),
    relays: relay ? [relay] : undefined,
  };
}

/** Extracts the event a 👀 reaction points at, with relay hints and target author. */
export function getTargetPointer(event: NostrEvent): TargetPointer | null {
  const tags = event.tags;

  // NIP-25 reactions target the last e tag (or a tag for addressable events).
  const a = [...tags].reverse().find(([n]) => n === 'a');
  if (a?.[1]) return parseAddressTag(a[1], a[2]);

  const e = [...tags].reverse().find(([n]) => n === 'e');
  if (e?.[1]) {
    const author = e[4] ?? tags.find(([n]) => n === 'p')?.[1];
    return { type: 'event', id: e[1], relays: e[2] ? [e[2]] : undefined, author };
  }

  return null;
}

/** Stable key used to group reactions by their target. */
export function targetKey(p: TargetPointer): string {
  return p.type === 'event' ? p.id : `${p.kind}:${p.pubkey}:${p.identifier}`;
}
