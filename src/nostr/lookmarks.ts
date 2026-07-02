import type { NostrEvent } from 'nostr-tools';

/** The emoji that marks something as worth a look. */
export const EYES_EMOJI = '👀';

export type LookmarkType = 'reaction' | 'reply' | 'quote';

/** A resolved-or-pending target that a lookmark points at. */
export type TargetPointer =
  | { type: 'event'; id: string; relays?: string[]; author?: string }
  | { type: 'address'; kind: number; pubkey: string; identifier: string; relays?: string[] };

/** A target event together with every lookmark pointing at it. */
export interface LookmarkedEvent {
  /** The original event that was lookmarked. */
  event: NostrEvent;
  /** The lookmark events (reactions, replies, quotes). */
  lookmarks: NostrEvent[];
  /** Most recent lookmark timestamp. */
  latestLookmarkAt: number;
}

/** Classifies a lookmark event by how it points at its target. */
export function getLookmarkType(ev: NostrEvent): LookmarkType {
  if (ev.kind === 7) return 'reaction';
  return ev.tags.some(([n]) => n === 'q') ? 'quote' : 'reply';
}

/** A kind 1 note is a lookmark only if it references another event. */
export function isReferentialEvent(event: NostrEvent): boolean {
  return event.tags.some(([n]) => n === 'q' || n === 'e' || n === 'a');
}

/** Decides whether an event counts as a 👀 lookmark (optionally by a given author). */
export function isLookmark(event: NostrEvent, pubkey?: string): boolean {
  if (!event.content.includes(EYES_EMOJI)) return false;
  if (pubkey && event.pubkey !== pubkey) return false;
  if (event.kind === 7) return true;
  if (event.kind === 1) return isReferentialEvent(event);
  return false;
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

/** Extracts the target a lookmark points at, including any relay hints. */
export function getTargetPointer(event: NostrEvent): TargetPointer | null {
  const tags = event.tags;

  if (event.kind === 7) {
    // NIP-25 reactions target the last e/a tag.
    const a = [...tags].reverse().find(([n]) => n === 'a');
    if (a?.[1]) return parseAddressTag(a[1], a[2]);
    const e = [...tags].reverse().find(([n]) => n === 'e');
    if (e?.[1]) return { type: 'event', id: e[1], relays: e[2] ? [e[2]] : undefined, author: e[4] };
    return null;
  }

  // Quote (NIP-18): q tag = [q, id, relay, pubkey]
  const q = tags.find(([n]) => n === 'q');
  if (q?.[1]) return { type: 'event', id: q[1], relays: q[2] ? [q[2]] : undefined, author: q[3] };

  // Addressable reference: a tag = [a, kind:pubkey:identifier, relay]
  const a = tags.find(([n]) => n === 'a');
  if (a?.[1]) return parseAddressTag(a[1], a[2]);

  // Reply (NIP-10): prefer the marked reply, else the last e tag.
  const eTags = tags.filter(([n]) => n === 'e');
  const reply = eTags.find(([, , , marker]) => marker === 'reply') ?? eTags[eTags.length - 1];
  if (reply?.[1]) return { type: 'event', id: reply[1], relays: reply[2] ? [reply[2]] : undefined, author: reply[4] };

  return null;
}

/** Stable key used to group lookmarks by their target. */
export function targetKey(p: TargetPointer): string {
  return p.type === 'event' ? p.id : `${p.kind}:${p.pubkey}:${p.identifier}`;
}
