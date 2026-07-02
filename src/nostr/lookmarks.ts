import type { NostrEvent } from 'nostr-tools';

/** The emoji that marks something as worth a look. */
export const EYES_EMOJI = '👀';

/** The kind of signal a lookmark carries. */
export type LookmarkType = 'reaction' | 'reply' | 'quote';

/** A resolved-or-pending target that a lookmark points at. */
export type TargetPointer =
  | { type: 'event'; id: string; relays?: string[]; author?: string }
  | { type: 'address'; kind: number; pubkey: string; identifier: string; relays?: string[] };

/** A target event together with every lookmark pointing at it. */
export interface LookmarkedEvent {
  /** The original event that was lookmarked. */
  event: NostrEvent;
  /** The lookmark events (👀 reactions, replies, and quotes). */
  lookmarks: NostrEvent[];
  /** Most recent lookmark timestamp. */
  latestLookmarkAt: number;
}

/** Whether a kind 1 note points at another event (reply or quote). */
export function isReferentialEvent(event: NostrEvent): boolean {
  return event.tags.some(([name]) => name === 'q' || name === 'e' || name === 'a');
}

/**
 * A lookmark is a 👀 reaction (kind 7), or a kind 1 note containing 👀 that
 * replies to or quotes another event.
 */
export function isLookmark(event: NostrEvent, pubkey?: string): boolean {
  if (pubkey && event.pubkey !== pubkey) return false;
  if (!event.content.includes(EYES_EMOJI)) return false;
  if (event.kind === 7) return true;
  if (event.kind === 1) return isReferentialEvent(event);
  return false;
}

/** Classifies a lookmark as a reaction, quote, or reply. */
export function getLookmarkType(event: NostrEvent): LookmarkType {
  if (event.kind === 7) return 'reaction';
  if (event.tags.some(([name]) => name === 'q')) return 'quote';
  return 'reply';
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

/** Extracts the event a lookmark points at, with relay hints and target author. */
export function getTargetPointer(event: NostrEvent): TargetPointer | null {
  const tags = event.tags;
  const findLast = (name: string) => [...tags].reverse().find(([n]) => n === name);

  // NIP-18 quote (a quoted event takes priority over a reply thread).
  const q = findLast('q');
  if (q?.[1]) {
    if (q[1].includes(':')) {
      const address = parseAddressTag(q[1], q[2]);
      if (address) return address;
    }
    return { type: 'event', id: q[1], relays: q[2] ? [q[2]] : undefined, author: q[3] };
  }

  // Addressable target (reaction to / reply to an addressable event).
  const a = findLast('a');
  if (a?.[1]) {
    const address = parseAddressTag(a[1], a[2]);
    if (address) return address;
  }

  // NIP-10 reply target / NIP-25 reaction target.
  const e = findLast('e');
  if (e?.[1]) {
    const author = e[4] ?? tags.find(([n]) => n === 'p')?.[1];
    return { type: 'event', id: e[1], relays: e[2] ? [e[2]] : undefined, author };
  }

  return null;
}

/** Stable key used to group lookmarks by their target. */
export function targetKey(p: TargetPointer): string {
  return p.type === 'event' ? p.id : `${p.kind}:${p.pubkey}:${p.identifier}`;
}
