import { nip19 } from 'nostr-tools';
import { ExternalLink, Clock, MessageSquare, Heart, Repeat, Eye } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NoteContent } from '@/components/NoteContent';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import type { LookmarkedEvent } from '@/hooks/useLookmarks';

interface LookmarkCardProps {
  lookmarkedEvent: LookmarkedEvent;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function LookmarkCard({ lookmarkedEvent }: LookmarkCardProps) {
  const { event, lookmarks, latestLookmarkAt } = lookmarkedEvent;
  const author = useAuthor(event.pubkey);
  
  const nevent = nip19.neventEncode({ id: event.id, author: event.pubkey });
  
  const displayName = author.data?.metadata?.name || genUserName(event.pubkey);
  const avatar = author.data?.metadata?.picture;
  const nip05 = author.data?.metadata?.nip05;
  
  // Find the most recent lookmark event
  const latestLookmark = lookmarks.find(l => l.created_at === latestLookmarkAt) || lookmarks[0];
  const latestLookmarkAuthor = useAuthor(latestLookmark?.pubkey);
  const latestLookmarkDisplayName = latestLookmarkAuthor.data?.metadata?.name 
    || (latestLookmark ? genUserName(latestLookmark.pubkey) : '');
  const latestLookmarkNpub = latestLookmark ? nip19.npubEncode(latestLookmark.pubkey) : undefined;
  
  const getLookmarkType = (ev: LookmarkedEvent['lookmarks'][number]): 'reaction' | 'reply' | 'quote' => {
    if (ev.kind === 7) return 'reaction';
    return ev.tags.some(([n]) => n === 'q') ? 'quote' : 'reply';
  };

  const { reactionCount, replyCount, quoteCount, latestReaction, latestReply, latestQuote } = (() => {
    let reactionCount = 0;
    let replyCount = 0;
    let quoteCount = 0;
    let latestReaction: LookmarkedEvent['lookmarks'][number] | undefined;
    let latestReply: LookmarkedEvent['lookmarks'][number] | undefined;
    let latestQuote: LookmarkedEvent['lookmarks'][number] | undefined;

    for (const lm of lookmarks) {
      const t = getLookmarkType(lm);
      if (t === 'reaction') {
        reactionCount += 1;
        if (!latestReaction || lm.created_at > latestReaction.created_at) latestReaction = lm;
      } else if (t === 'reply') {
        replyCount += 1;
        if (!latestReply || lm.created_at > latestReply.created_at) latestReply = lm;
      } else {
        quoteCount += 1;
        if (!latestQuote || lm.created_at > latestQuote.created_at) latestQuote = lm;
      }
    }

    return { reactionCount, replyCount, quoteCount, latestReaction, latestReply, latestQuote };
  })();
  
  const handleOpenNjump = () => {
    window.open(`https://njump.to/${nevent}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenLookmarkNjump = (
    e: React.MouseEvent,
    lookmark: LookmarkedEvent['lookmarks'][number] | undefined
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!lookmark) return;
    const lookmarkNevent = nip19.neventEncode({ id: lookmark.id, author: lookmark.pubkey });
    window.open(`https://njump.to/${lookmarkNevent}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenNative = () => {
    window.open(`nostr:${nevent}`, '_self');
  };

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border-border/50 hover:border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm shrink-0">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate max-w-[200px]">
                  {displayName}
                </span>
              </div>
              {nip05 && (
                <span className="text-xs text-muted-foreground truncate block max-w-[250px]">
                  {nip05}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleOpenNjump}
            className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 hover:text-foreground transition-colors cursor-pointer"
            title="Open in njump.to"
          >
            <Clock className="h-3 w-3" />
            <span>{formatTimestamp(event.created_at)}</span>
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="text-sm text-foreground/90">
          <NoteContent event={event} className="line-clamp-[12]" />
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between border-t border-border/30 mt-2 pt-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Lookmark stats */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {reactionCount > 0 && (
              <button
                type="button"
                onClick={(e) => handleOpenLookmarkNjump(e, latestReaction)}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                title="Open most recent 👀 reaction lookmark in njump.to"
                aria-label="Open most recent reaction lookmark in njump.to"
              >
                <Eye className="h-3 w-3 text-muted-foreground" />
                <Heart className="h-3 w-3" />
                <span className="font-medium text-foreground">{reactionCount}</span>
              </button>
            )}
            
            {replyCount > 0 && (
              <button
                type="button"
                onClick={(e) => handleOpenLookmarkNjump(e, latestReply)}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                title="Open most recent 👀 reply lookmark in njump.to"
                aria-label="Open most recent reply lookmark in njump.to"
              >
                <Eye className="h-3 w-3 text-muted-foreground" />
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium text-foreground">{replyCount}</span>
              </button>
            )}
            
            {quoteCount > 0 && (
              <button
                type="button"
                onClick={(e) => handleOpenLookmarkNjump(e, latestQuote)}
                className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                title="Open most recent 👀 quote lookmark in njump.to"
                aria-label="Open most recent quote lookmark in njump.to"
              >
                <Eye className="h-3 w-3 text-muted-foreground" />
                <Repeat className="h-3 w-3" />
                <span className="font-medium text-foreground">{quoteCount}</span>
              </button>
            )}
          </div>
          
          {latestLookmark && latestLookmarkDisplayName ? (
            <span className="text-xs text-muted-foreground">
              Lookmarked by{' '}
              {latestLookmarkNpub ? (
                <Link
                  to={`/${latestLookmarkNpub}`}
                  className="font-medium text-foreground hover:underline"
                >
                  @{latestLookmarkDisplayName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  @{latestLookmarkDisplayName}
                </span>
              )}{' '}
              <button
                type="button"
                onClick={(e) => handleOpenLookmarkNjump(e, latestLookmark)}
                className="ml-1 inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/90 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                title="Open latest lookmark event in njump.to"
                aria-label="Open latest lookmark event in njump.to"
              >
                {getLookmarkType(latestLookmark) === 'reaction'
                  ? 'Reaction'
                  : getLookmarkType(latestLookmark) === 'reply'
                    ? 'Reply'
                    : 'Quote'}
              </button>
              {formatTimestamp(latestLookmarkAt)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Last 👀 {formatTimestamp(latestLookmarkAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleOpenNjump}
            aria-label="Open in njump.to"
            title="Open in njump.to"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleOpenNative}
            aria-label="Open in your Nostr client"
            title="Open in your Nostr client"
          >
            <FontAwesomeIcon icon={faMobileScreen} className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
