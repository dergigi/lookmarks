import { nip19 } from 'nostr-tools';
import { ExternalLink, Clock, MessageSquare, Heart, Repeat, Eye } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

function getEventKindLabel(kind: number): string {
  switch (kind) {
    case 1: return 'Note';
    case 30023: return 'Article';
    case 30024: return 'Draft';
    case 1063: return 'File';
    case 1311: return 'Live Chat';
    case 31922: case 31923: return 'Calendar';
    case 30402: return 'Listing';
    default: return `Kind ${kind}`;
  }
}

function getKindIcon(kind: number) {
  switch (kind) {
    case 1: return MessageSquare;
    case 30023: case 30024: return MessageSquare;
    default: return MessageSquare;
  }
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
  
  // Count lookmark types
  const reactionCount = lookmarks.filter(e => e.kind === 7).length;
  const replyCount = lookmarks.filter(e => e.kind === 1 && !e.tags.some(([n]) => n === 'q')).length;
  const quoteCount = lookmarks.filter(e => e.kind === 1 && e.tags.some(([n]) => n === 'q')).length;
  
  const KindIcon = getKindIcon(event.kind);

  const handleOpenNjump = () => {
    window.open(`https://njump.to/${nevent}`, '_blank', 'noopener,noreferrer');
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
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0">
                  <KindIcon className="h-3 w-3 mr-1" />
                  {getEventKindLabel(event.kind)}
                </Badge>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-amber-500" />
                    <Heart className="h-3 w-3" />
                    <span>{reactionCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>👀 Reactions</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {replyCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-amber-500" />
                    <MessageSquare className="h-3 w-3" />
                    <span>{replyCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>👀 Replies</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {quoteCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-amber-500" />
                    <Repeat className="h-3 w-3" />
                    <span>{quoteCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>👀 Quotes</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          
          {latestLookmark && latestLookmarkDisplayName ? (
            <span className="text-xs text-muted-foreground">
              👀 by <span className="font-medium text-foreground">@{latestLookmarkDisplayName}</span> {formatTimestamp(latestLookmarkAt)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Last 👀 {formatTimestamp(latestLookmarkAt)}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-1 sm:px-2 text-xs"
                onClick={handleOpenNjump}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">njump</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open in njump.to</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-1 sm:px-2 text-xs"
                onClick={handleOpenNative}
              >
                <FontAwesomeIcon icon={faMobileScreen} className="h-3.5 w-3.5 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Native</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open in your Nostr client</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardFooter>
    </Card>
  );
}
