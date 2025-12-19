import { useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { ExternalLink, Eye, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { useLookmarkEvents, type LookmarkEventItem } from '@/hooks/useLookmarkEvents';

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
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function parseAddressableTag(aTag: string): { kind: number; pubkey: string; identifier: string } | null {
  const parts = aTag.split(':');
  if (parts.length !== 3) return null;
  const kind = parseInt(parts[0], 10);
  if (Number.isNaN(kind)) return null;
  return { kind, pubkey: parts[1], identifier: parts[2] };
}

function getTargetForLookmarkEvent(
  ev: NostrEvent,
): { label: string; nip19: string } | null {
  if (ev.kind === 7) {
    const eTag = ev.tags.find(([name]) => name === 'e')?.[1];
    if (!eTag) return null;
    return { label: 'Open target', nip19: nip19.neventEncode({ id: eTag }) };
  }

  const qTag = ev.tags.find(([name]) => name === 'q')?.[1];
  if (qTag) {
    return { label: 'Open quoted', nip19: nip19.neventEncode({ id: qTag }) };
  }

  const aTag = ev.tags.find(([name]) => name === 'a')?.[1];
  if (aTag) {
    const parsed = parseAddressableTag(aTag);
    if (!parsed) return null;
    return {
      label: 'Open referenced',
      nip19: nip19.naddrEncode({
        kind: parsed.kind,
        pubkey: parsed.pubkey,
        identifier: parsed.identifier,
      }),
    };
  }

  const eTags = ev.tags.filter(([name]) => name === 'e');
  const replyTag = eTags.find(([, , , marker]) => marker === 'reply') ?? eTags[eTags.length - 1];
  if (replyTag?.[1]) {
    return { label: 'Open replied-to', nip19: nip19.neventEncode({ id: replyTag[1] }) };
  }

  return null;
}

function LookmarkEventSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6 mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="pt-3 border-t border-border/30">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </CardFooter>
    </Card>
  );
}

function LookmarkEventCard({ item }: { item: LookmarkEventItem }) {
  const { event, type } = item;
  const label =
    type === 'reaction' ? '👀 reaction' : type === 'quote' ? '👀 quote' : '👀 reply';

  const lookmarkId = nip19.neventEncode({ id: event.id, author: event.pubkey });
  const target = getTargetForLookmarkEvent(event);

  const openNjump = (nip19Id: string) => {
    window.open(`https://njump.to/${nip19Id}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4 text-amber-500" />
            <span className="text-foreground">{label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatTimestamp(event.created_at)}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {event.kind === 1 ? (
          <div className="text-sm text-foreground/90">
            <NoteContent event={event} className="whitespace-pre-wrap break-words line-clamp-[10]" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Reaction to an event.
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center gap-2 justify-between border-t border-border/30 mt-2 pt-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNjump(lookmarkId)}
            aria-label="Open lookmark event on njump.to"
            title="Open lookmark event on njump.to"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open lookmark
          </Button>

          {target && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openNjump(target.nip19)}
              aria-label={`${target.label} on njump.to`}
              title={`${target.label} on njump.to`}
            >
              {target.label}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export function LookmarkEventsFeed({ pubkey }: { pubkey: string }) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLookmarkEvents(pubkey);

  const items = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.items) ?? [];
    // Deduplicate by event id (can happen when combining two filters on some relays)
    const seen = new Set<string>();
    const deduped: LookmarkEventItem[] = [];
    for (const item of all) {
      if (seen.has(item.event.id)) continue;
      seen.add(item.event.id);
      deduped.push(item);
    }
    return deduped.sort((a, b) => b.event.created_at - a.event.created_at);
  }, [data?.pages]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading 👀 lookmark events…</span>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <LookmarkEventSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-12 px-8 text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">Failed to load lookmarks</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was an error fetching this user&apos;s 👀 events. Please try again.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-card/30">
        <CardContent className="py-16 px-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Eye className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No lookmarks found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            This user hasn&apos;t posted any 👀 lookmark events yet (or they aren&apos;t available on your read relays).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{items.length}</span> 👀 events
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs"
        >
          {isFetching && !isFetchingNextPage ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <LookmarkEventCard key={item.event.id} item={item} />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full max-w-xs"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading more…
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}


