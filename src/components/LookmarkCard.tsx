import { nip19 } from 'nostr-tools';
import { ExternalLink, Clock, MessageSquare, Heart, Repeat, Eye, AlertCircle } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { NoteContent } from '@/components/NoteContent';
import { useAuthor } from '@/hooks/useAuthor';
import { formatTimestamp } from '@/lib/formatTimestamp';
import { genUserName } from '@/lib/genUserName';
import { getLookmarkType, type LookmarkedEvent } from '@/hooks/useLookmarks';

interface LookmarkCardProps {
  lookmarkedEvent: LookmarkedEvent;
}

export function LookmarkCard({ lookmarkedEvent }: LookmarkCardProps) {
  const { event, targetId, lookmarks, latestLookmarkAt } = lookmarkedEvent;

  // Early return for missing target - render placeholder card
  if (!event) {
    return (
      <MissingTargetCard
        targetId={targetId}
        lookmarks={lookmarks}
        latestLookmarkAt={latestLookmarkAt}
      />
    );
  }

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
          <Link to={`/p/${nip19.npubEncode(event.pubkey)}`} className="flex items-center gap-3 min-w-0 group/author">
            <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm shrink-0">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground truncate max-w-[200px] group-hover/author:underline">
                  {displayName}
                </span>
              </div>
              {nip05 && (
                <span className="text-xs text-muted-foreground truncate block max-w-[250px]">
                  {nip05}
                </span>
              )}
            </div>
          </Link>
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
              by{' '}
              {latestLookmarkNpub ? (
                <Link
                  to={`/p/${latestLookmarkNpub}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {latestLookmarkDisplayName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {latestLookmarkDisplayName}
                </span>
              )}{' '}
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

/**
 * Placeholder card shown when a lookmark's target event couldn't be resolved.
 * This prevents empty feeds - users see something instead of nothing.
 */
interface MissingTargetCardProps {
  targetId: string;
  lookmarks: LookmarkedEvent['lookmarks'];
  latestLookmarkAt: number;
}

function MissingTargetCard({ targetId, lookmarks, latestLookmarkAt }: MissingTargetCardProps) {
  // Find the most recent lookmark event
  const latestLookmark = lookmarks.find(l => l.created_at === latestLookmarkAt) || lookmarks[0];
  const latestLookmarkAuthor = useAuthor(latestLookmark?.pubkey);
  const latestLookmarkDisplayName = latestLookmarkAuthor.data?.metadata?.name
    || (latestLookmark ? genUserName(latestLookmark.pubkey) : '');
  const latestLookmarkNpub = latestLookmark ? nip19.npubEncode(latestLookmark.pubkey) : undefined;

  // Determine target type and create appropriate njump URL.
  // Wrap encoding in try/catch for safety against malformed input.
  const { isAddressable, kindLabel, displayId, njumpUrl } = (() => {
    // Event ID: 64 hex characters
    if (/^[a-f0-9]{64}$/i.test(targetId)) {
      try {
        const nevent = nip19.neventEncode({ id: targetId });
        return {
          isAddressable: false,
          kindLabel: null,
          displayId: `${targetId.slice(0, 8)}...${targetId.slice(-8)}`,
          njumpUrl: `https://njump.to/${nevent}`,
        };
      } catch {
        return { isAddressable: false, kindLabel: null, displayId: targetId.slice(0, 16), njumpUrl: null };
      }
    }

    // Addressable: kind:pubkey:identifier
    const parts = targetId.split(':');
    if (parts.length === 3) {
      const kind = parseInt(parts[0], 10);
      const pubkey = parts[1];
      const identifier = parts[2];
      if (!isNaN(kind) && /^[a-f0-9]{64}$/i.test(pubkey)) {
        // Human-readable kind labels for common addressable event types
        const kindLabels: Record<number, string> = {
          30023: 'Long-form article',
          30024: 'Draft article',
          30030: 'Emoji set',
          30078: 'App-specific data',
          31922: 'Calendar event',
          31923: 'Calendar RSVP',
          31989: 'Handler recommendation',
          31990: 'Handler information',
        };
        const label = kindLabels[kind] ?? `Kind ${kind}`;
        const shortId = identifier ? `d:${identifier.slice(0, 12)}${identifier.length > 12 ? '...' : ''}` : 'addressable event';

        try {
          const naddr = nip19.naddrEncode({ kind, pubkey, identifier });
          return {
            isAddressable: true,
            kindLabel: label,
            displayId: shortId,
            njumpUrl: `https://njump.to/${naddr}`,
          };
        } catch {
          return { isAddressable: true, kindLabel: label, displayId: shortId, njumpUrl: null };
        }
      }
    }

    // Unknown format
    return { isAddressable: false, kindLabel: null, displayId: targetId.slice(0, 16), njumpUrl: null };
  })();

  const handleOpenNjump = () => {
    if (!njumpUrl) return;
    window.open(njumpUrl, '_blank', 'noopener,noreferrer');
  };

  const { reactionCount, replyCount, quoteCount } = (() => {
    let reactionCount = 0;
    let replyCount = 0;
    let quoteCount = 0;

    for (const lm of lookmarks) {
      const t = getLookmarkType(lm);
      if (t === 'reaction') reactionCount += 1;
      else if (t === 'reply') replyCount += 1;
      else quoteCount += 1;
    }

    return { reactionCount, replyCount, quoteCount };
  })();

  return (
    <Card className="group transition-all duration-300 border-dashed border-border/50 bg-card/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-muted-foreground">
                {isAddressable ? 'Addressable event unavailable' : 'Event unavailable'}
              </span>
              <span className="text-xs text-muted-foreground/70 block truncate max-w-[250px]">
                {kindLabel && <span className="mr-1">{kindLabel} ·</span>}
                {displayId}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3 inline mr-1" />
            {formatTimestamp(latestLookmarkAt)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground">
          This {isAddressable ? 'addressable event' : 'event'} couldn't be loaded from your relays. It may be on a different relay or deleted.
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/30 mt-2 pt-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {reactionCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1">
                <Eye className="h-3 w-3" />
                <Heart className="h-3 w-3" />
                <span className="font-medium text-foreground">{reactionCount}</span>
              </span>
            )}
            {replyCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1">
                <Eye className="h-3 w-3" />
                <MessageSquare className="h-3 w-3" />
                <span className="font-medium text-foreground">{replyCount}</span>
              </span>
            )}
            {quoteCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1">
                <Eye className="h-3 w-3" />
                <Repeat className="h-3 w-3" />
                <span className="font-medium text-foreground">{quoteCount}</span>
              </span>
            )}
          </div>

          {latestLookmark && latestLookmarkDisplayName && (
            <span className="text-xs text-muted-foreground">
              by{' '}
              {latestLookmarkNpub ? (
                <Link
                  to={`/p/${latestLookmarkNpub}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {latestLookmarkDisplayName}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {latestLookmarkDisplayName}
                </span>
              )}
            </span>
          )}
        </div>

        {njumpUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleOpenNjump}
            aria-label="Try opening in njump.to"
            title="Try opening in njump.to"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            Try njump
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
