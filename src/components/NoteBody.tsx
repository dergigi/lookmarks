import { Link } from 'react-router-dom';
import { use$, useRenderedContent, type ComponentMap } from 'applesauce-react/hooks';
import { isAudioURL, isImageURL, isVideoURL } from 'applesauce-core/helpers';
import type { NostrEvent } from 'nostr-tools';

import { NjumpLink } from '@/components/NjumpLink';
import { eventStore } from '@/nostr/core';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

const mentionLinkClass = 'font-medium text-primary hover:underline';

/** Resolves an npub/nprofile mention to the user's display name. */
function ProfileMention({ pubkey, encoded }: { pubkey: string; encoded: string }) {
  const { displayName } = useProfile(pubkey);
  return (
    <Link to={`/${encoded}`} className={mentionLinkClass}>
      @{displayName}
    </Link>
  );
}

/** Resolves a note/nevent mention to the referenced note's author. */
function EventMention({
  id,
  relays,
  fallbackAuthor,
  encoded,
}: {
  id: string;
  relays?: string[];
  fallbackAuthor?: string;
  encoded: string;
}) {
  const event = use$(() => eventStore.event({ id, relays }), [id]);
  const author = event?.pubkey ?? fallbackAuthor;
  const { displayName } = useProfile(author);
  return (
    <Link to={`/${encoded}`} className={mentionLinkClass}>
      ↗ note{author ? ` by ${displayName}` : ''}
    </Link>
  );
}

/** How each parsed content token is rendered. Kept intentionally minimal. */
const components: ComponentMap = {
  text: ({ node }) => <>{node.value}</>,
  link: ({ node }) => {
    const { href, value } = node;
    if (isImageURL(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 block">
          <img
            src={href}
            alt=""
            loading="lazy"
            className="max-h-80 rounded-lg border border-border/50 object-cover"
          />
        </a>
      );
    }
    if (isVideoURL(href)) {
      return (
        <video
          src={href}
          controls
          playsInline
          className="mt-2 max-h-80 rounded-lg border border-border/50"
        />
      );
    }
    if (isAudioURL(href)) {
      return <audio src={href} controls className="mt-2 w-full" />;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {value}
      </a>
    );
  },
  mention: ({ node }) => {
    const { decoded, encoded } = node;
    switch (decoded.type) {
      case 'npub':
        return <ProfileMention pubkey={decoded.data} encoded={encoded} />;
      case 'nprofile':
        return <ProfileMention pubkey={decoded.data.pubkey} encoded={encoded} />;
      case 'note':
        return <EventMention id={decoded.data} encoded={encoded} />;
      case 'nevent':
        return (
          <EventMention
            id={decoded.data.id}
            relays={decoded.data.relays}
            fallbackAuthor={decoded.data.author}
            encoded={encoded}
          />
        );
      case 'naddr':
        return (
          <Link to={`/${encoded}`} className={mentionLinkClass}>
            ↗ post
          </Link>
        );
      default:
        return (
          <NjumpLink id={encoded} className="text-primary hover:underline">
            @{encoded.slice(0, 12)}…
          </NjumpLink>
        );
    }
  },
  hashtag: ({ node }) => <span className="text-primary">#{node.hashtag}</span>,
  emoji: ({ node }) => (
    <img
      src={node.url}
      alt={node.code}
      title={node.raw}
      className="inline-block h-5 w-5 align-text-bottom"
    />
  ),
};

/** Renders a Nostr event's text content (links, media, mentions, hashtags, emoji). */
export function NoteBody({ event, className }: { event: NostrEvent; className?: string }) {
  const content = useRenderedContent(event, components);
  return <div className={cn('whitespace-pre-wrap break-words', className)}>{content}</div>;
}
