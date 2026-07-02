import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { ExternalLink, Heart, MessageSquare, Repeat } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NoteBody } from '@/components/NoteBody';
import { useProfile } from '@/hooks/useProfile';
import { formatTimestamp } from '@/lib/formatTimestamp';
import { getLookmarkType, type LookmarkedEvent } from '@/nostr/lookmarks';

function useCounts(lookmarks: LookmarkedEvent['lookmarks']) {
  let reaction = 0;
  let reply = 0;
  let quote = 0;
  for (const lm of lookmarks) {
    const t = getLookmarkType(lm);
    if (t === 'reaction') reaction += 1;
    else if (t === 'reply') reply += 1;
    else quote += 1;
  }
  return { reaction, reply, quote };
}

export function LookmarkCard({ lookmarkedEvent }: { lookmarkedEvent: LookmarkedEvent }) {
  const { event, lookmarks, latestLookmarkAt } = lookmarkedEvent;
  const author = useProfile(event.pubkey);

  const npub = nip19.npubEncode(event.pubkey);
  const nevent = nip19.neventEncode({ id: event.id, author: event.pubkey });

  const latest = lookmarks.reduce((a, b) => (b.created_at > a.created_at ? b : a), lookmarks[0]);
  const latestAuthor = useProfile(latest?.pubkey);
  const latestNpub = latest ? nip19.npubEncode(latest.pubkey) : undefined;

  const counts = useCounts(lookmarks);

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="mb-3 flex items-center gap-3">
        <Link to={`/p/${npub}`} className="flex min-w-0 items-center gap-3 group">
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
          href={`https://njump.me/${nevent}`}
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
        <div className="flex items-center gap-3">
          {counts.reaction > 0 && (
            <span className="inline-flex items-center gap-1" title="👀 reactions">
              <Heart className="h-3.5 w-3.5" />
              {counts.reaction}
            </span>
          )}
          {counts.reply > 0 && (
            <span className="inline-flex items-center gap-1" title="👀 replies">
              <MessageSquare className="h-3.5 w-3.5" />
              {counts.reply}
            </span>
          )}
          {counts.quote > 0 && (
            <span className="inline-flex items-center gap-1" title="👀 quotes">
              <Repeat className="h-3.5 w-3.5" />
              {counts.quote}
            </span>
          )}
        </div>

        {latest && (
          <span className="truncate">
            👀 by{' '}
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
          href={`https://njump.me/${nevent}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
          title="Open in njump.me"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}
