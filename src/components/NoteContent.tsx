import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useEvent } from '@/hooks/useEvent';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
  maxQuoteDepth?: number;
}

// Common image extensions
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i;
// Common video extensions
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return IMAGE_EXTENSIONS.test(urlObj.pathname);
  } catch {
    return false;
  }
}

function isVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return VIDEO_EXTENSIONS.test(urlObj.pathname);
  } catch {
    return false;
  }
}

/** Parses content of text note events so that URLs and hashtags are linkified. */
export function NoteContent({
  event, 
  className,
  maxQuoteDepth = 1,
}: NoteContentProps) {  
  // Process the content to render mentions, links, etc.
  const content = useMemo(() => {
    const text = event.content;
    
    // Regex to find URLs, Nostr references, and hashtags
    const regex = /(https?:\/\/[^\s]+)|nostr:(npub1|note1|nprofile1|nevent1|naddr1)([023456789acdefghjklmnpqrstuvwxyz]+)|(#\w+)/g;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, url, nostrPrefix, nostrData, hashtag] = match;
      const index = match.index;
      
      // Add text before this match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      if (url) {
        // Clean URL (remove trailing punctuation that might have been captured)
        const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
        
        // Check if it's an image
        if (isImageUrl(cleanUrl)) {
          parts.push(
            <a
              key={`img-link-${keyCounter++}`}
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block my-2"
            >
              <img
                src={cleanUrl}
                alt=""
                className="max-w-full h-auto rounded-lg max-h-96 object-contain"
                loading="lazy"
              />
            </a>
          );
        }
        // Check if it's a video
        else if (isVideoUrl(cleanUrl)) {
          parts.push(
            <video
              key={`video-${keyCounter++}`}
              src={cleanUrl}
              controls
              className="max-w-full h-auto rounded-lg my-2 max-h-96"
              preload="metadata"
            />
          );
        }
        // Regular URL
        else {
          parts.push(
            <a 
              key={`url-${keyCounter++}`}
              href={cleanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 dark:text-amber-400 hover:underline break-all"
            >
              {cleanUrl}
            </a>
          );
        }
        
        // Add back any trailing punctuation that was removed
        const trailingChars = url.slice(cleanUrl.length);
        if (trailingChars) {
          parts.push(trailingChars);
        }
      } else if (nostrPrefix && nostrData) {
        // Handle Nostr references
        try {
          const nostrId = `${nostrPrefix}${nostrData}`;
          const decoded = nip19.decode(nostrId);
          
          if (decoded.type === 'npub') {
            const pubkey = decoded.data;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'nprofile') {
            const pubkey = decoded.data.pubkey;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'nevent' && maxQuoteDepth > 0) {
            // Render nevent as embedded quoted event (only if depth allows)
            const eventId = decoded.data.id;
            parts.push(
              <QuotedEvent 
                key={`quoted-${keyCounter++}`} 
                eventId={eventId}
                nevent={nostrId}
                maxQuoteDepth={maxQuoteDepth - 1}
              />
            );
          } else if (decoded.type === 'note' && maxQuoteDepth > 0) {
            // Render note1 as embedded quoted event (only if depth allows)
            const eventId = decoded.data;
            parts.push(
              <QuotedEvent 
                key={`quoted-${keyCounter++}`} 
                eventId={eventId}
                nevent={nostrId}
                maxQuoteDepth={maxQuoteDepth - 1}
              />
            );
          } else if ((decoded.type === 'nevent' || decoded.type === 'note') && maxQuoteDepth === 0) {
            // Max depth reached, show as link
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-amber-600 dark:text-amber-400 hover:underline break-all"
              >
                {fullMatch}
              </Link>
            );
          } else {
            // For other types (naddr), show as a link
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-amber-600 dark:text-amber-400 hover:underline break-all"
              >
                {fullMatch}
              </Link>
            );
          }
        } catch {
          // If decoding fails, just render as text
          parts.push(fullMatch);
        }
      } else if (hashtag) {
        // Handle hashtags
        const tag = hashtag.slice(1); // Remove the #
        parts.push(
          <Link 
            key={`hashtag-${keyCounter++}`}
            to={`/t/${tag}`}
            className="text-amber-600 dark:text-amber-400 hover:underline"
          >
            {hashtag}
          </Link>
        );
      }
      
      lastIndex = index + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no special content was found, just use the plain text
    if (parts.length === 0) {
      parts.push(text);
    }
    
    return parts;
  }, [event, maxQuoteDepth]);

  return (
    <div className={cn("whitespace-pre-wrap break-words overflow-hidden", className)}>
      {content.length > 0 ? content : event.content}
    </div>
  );
}

// Helper component to display user mentions
function NostrMention({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const hasRealName = !!author.data?.metadata?.name;
  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);

  return (
    <Link 
      to={`/${npub}`}
      className={cn(
        "font-medium hover:underline",
        hasRealName 
          ? "text-amber-600 dark:text-amber-400" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      @{displayName}
    </Link>
  );
}

// Helper component to display quoted/embedded events
function QuotedEvent({ 
  eventId, 
  nevent,
  maxQuoteDepth = 0,
}: { 
  eventId: string; 
  nevent: string;
  maxQuoteDepth?: number;
}) {
  const { data: event, isLoading } = useEvent(eventId);
  const author = useAuthor(event?.pubkey);

  if (isLoading) {
    return (
      <Card className="my-3 border-border/50 bg-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    // Fallback to link if event not found
    return (
      <Link 
        to={`/${nevent}`}
        className="text-amber-600 dark:text-amber-400 hover:underline break-all inline-block my-2"
      >
        {nevent}
      </Link>
    );
  }

  const displayName = author.data?.metadata?.name || genUserName(event.pubkey);
  const avatar = author.data?.metadata?.picture;

  return (
    <Card className="my-3 border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
      <CardHeader className="pb-3">
        <Link 
          to={`/${nevent}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={avatar} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(event.created_at * 1000).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: new Date().getFullYear() !== new Date(event.created_at * 1000).getFullYear() ? 'numeric' : undefined,
              })}
            </div>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-foreground/90 line-clamp-4">
          <NoteContent event={event} maxQuoteDepth={maxQuoteDepth} />
        </div>
      </CardContent>
    </Card>
  );
}
