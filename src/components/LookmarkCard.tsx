import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { ExternalLink, MessageSquare, Repeat } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NoteBody } from '@/components/NoteBody';
import { useProfile } from '@/hooks/useProfile';
import { formatTimestamp } from '@/lib/formatTimestamp';
import { getLookmarkType, type LookmarkedEvent } from '@/nostr/lookmarks';

export function LookmarkCard({ lookmarkedEvent }: { lookmarkedEvent: LookmarkedEvent }) {
  const { event, lookmarks, latestLookmarkAt } = lookmarkedEvent;
  const author = useProfile(event.pubkey);

  const npub = nip19.npubEncode(event.pubkey);
  const nevent = nip19.neventEncode({ id: event.id, author: event.pubkey });

  const counts = lookmarks.reduce(
    (acc, lm) => {
      acc[getLookmarkType(lm)] += 1;
      return acc;
    },
    { reaction: 0, reply: 0, quote: 0 },
  );

  const latest = lookmarks.reduce((a, b) => (b.created_at > a.created_at ? b : a), lookmarks[0]);
  const latestAuthor = useProfile(latest?.pubkey);
  const latestNpub = latest ? nip19.npubEncode(latest.pubkey) : undefined;

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="mb-3 flex items-center gap-3">
        <Link to={`/p/${npub}`} className="group flex min-w-0 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={author.picture} alt={author.displayName} />
            <AvatarFallback>{author.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground group-hover:underline">
              {author.displayName}
            </div>
            {author.nip05 && (
              <div className="truncate text-xs text-muted-foreground">{author.nip05}</div>
            )}
          </div>
        </Link>
        <a
          href={`https://njump.to/${nevent}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground"
          title="Open note"
        >
          {formatTimestamp(event.created_at)}
        </a>
      </div>

      <NoteBody event={event} className="text-sm text-foreground/90 line-clamp-[12]" />

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        {counts.reaction > 0 && (
          <span className="inline-flex items-center gap-1" title="👀 reactions">
            <span aria-hidden>👀</span>
            <span className="font-medium text-foreground">{counts.reaction}</span>
          </span>
        )}
        {counts.reply > 0 && (
          <span className="inline-flex items-center gap-1" title="replies">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{counts.reply}</span>
          </span>
        )}
        {counts.quote > 0 && (
          <span className="inline-flex items-center gap-1" title="quotes">
            <Repeat className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{counts.quote}</span>
          </span>
        )}

        {latest && (
          <span className="truncate">
            last by{' '}
            {latestNpub ? (
              <Link to={`/p/${latestNpub}`} className="font-medium text-foreground hover:underline">
                {latestAuthor.displayName}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{latestAuthor.displayName}</span>
            )}{' '}
            {formatTimestamp(latestLookmarkAt)}
          </span>
        )}

        <a
          href={`https://njump.to/${nevent}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
          title="Open in njump.to"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}
