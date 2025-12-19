import { useMemo } from 'react';
import { Eye, Loader2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { LookmarkCard } from '@/components/LookmarkCard';
import { ConnectedRelaysPill } from '@/components/ConnectedRelaysPill';
import { useLookmarks, type LookmarkedEvent } from '@/hooks/useLookmarks';

interface LookmarkFeedProps {
  pubkey?: string;
}

function LookmarkSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/30">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </Card>
  );
}

export function LookmarkFeed({ pubkey }: LookmarkFeedProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLookmarks(pubkey);

  // Flatten pages and deduplicate by event ID
  const lookmarks = useMemo((): LookmarkedEvent[] => {
    if (!data?.pages) return [];

    const seen = new Set<string>();
    const results: LookmarkedEvent[] = [];

    for (const page of data.pages) {
      if (!page?.lookmarkedEvents) continue;
      for (const item of page.lookmarkedEvents) {
        if (!seen.has(item.event.id)) {
          seen.add(item.event.id);
          results.push(item);
        }
      }
    }

    // Sort all results by most recent lookmark
    results.sort((a, b) => b.latestLookmarkAt - a.latestLookmarkAt);

    return results;
  }, [data?.pages]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Scanning for 👀 lookmarks...</span>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <LookmarkSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="py-12 px-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive/70 mb-4" />
          <h3 className="text-lg font-medium text-destructive mb-2">Failed to load lookmarks</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was an error fetching lookmarked events. Please try again.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (lookmarks.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-card/30">
        <CardContent className="py-16 px-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Eye className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No lookmarks found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {pubkey
              ? "This user hasn't lookmarked any events with 👀 yet."
              : "No events with 👀 reactions were found. Try checking your relay connections or come back later."
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Found{' '}
          <span className="font-semibold text-foreground">{lookmarks.length}</span>
          {' '}
          lookmarks across <ConnectedRelaysPill className="align-middle" />
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
        {lookmarks.map((lookmarkedEvent) => (
          <LookmarkCard key={lookmarkedEvent.event.id} lookmarkedEvent={lookmarkedEvent} />
        ))}
      </div>

      {/* Load More Button */}
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
                Loading more...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load more lookmarks
              </>
            )}
          </Button>
        </div>
      )}

      {/* End of results indicator */}
      {!hasNextPage && lookmarks.length > 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Eye className="h-4 w-4 inline-block mr-1 opacity-50" />
          You've seen all the lookmarks!
        </div>
      )}
    </div>
  );
}
