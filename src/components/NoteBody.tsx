import { useRenderedContent, type ComponentMap } from 'applesauce-react/hooks';
import { isAudioURL, isImageURL, isVideoURL } from 'applesauce-core/helpers';
import type { NostrEvent } from 'nostr-tools';

import { cn } from '@/lib/utils';

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
  mention: ({ node }) => (
    <a
      href={`https://njump.me/${node.encoded}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      @{node.encoded.slice(0, 12)}…
    </a>
  ),
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
