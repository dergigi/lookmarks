import { ChevronDown, Eye, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LookmarkCard } from '@/components/LookmarkCard';
import { NoteCardSkeleton } from '@/components/NoteCardSkeleton';
import { EmojiBar } from '@/components/EmojiBar';
import { ConnectedRelaysPill } from '@/components/ConnectedRelaysPill';
import { useLookmarksFeed } from '@/hooks/useLookmarksFeed';
import { EYES_EMOJI } from '@/nostr/lookmarks';

export function LookmarkFeed({ pubkey }: { pubkey?: string }) {
  const {
    lookmarks,
    loading,
    loadingMore,
    hasMore,
    error,
    relays,
    emojiBar,
    selectedEmoji,
    selectEmoji,
    loadMore,
    refresh,
  } = useLookmarksFeed(pubkey);

  const emoji = selectedEmoji.native ?? selectedEmoji.shortcode ?? selectedEmoji.key;
  const isEyes = selectedEmoji.key === EYES_EMOJI;
  const noun = isEyes ? 'lookmark' : 'reaction';

  let content: React.ReactNode;
  if (lookmarks.length === 0 && loading) {
    content = (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (error && lookmarks.length === 0) {
    content = (
      <div className="rounded-xl border border-dashed border-border py-14 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          Something went wrong while loading lookmarks.
        </p>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  } else if (lookmarks.length === 0) {
    content = (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <Eye className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {pubkey
            ? `No ${emoji} ${noun}s found for this user yet.`
            : `No ${emoji} ${noun}s found yet. Check back in a moment.`}
        </p>
        {hasMore && (
          <Button variant="ghost" size="sm" className="mt-4" onClick={loadMore}>
            Keep looking
          </Button>
        )}
      </div>
    );
  } else {
    content = (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {lookmarks.length} {lookmarks.length === 1 ? noun : `${noun}s`} across{' '}
            <ConnectedRelaysPill
              relays={relays}
              description={
                pubkey
                  ? "Reading this user's reactions and notes from their outbox relays."
                  : 'Reading reactions from a firehose and searching for replies & quotes across these relays.'
              }
            />
          </span>
          <Button variant="ghost" size="sm" className="text-xs" onClick={refresh}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {lookmarks.map((item) => (
            <LookmarkCard key={item.event.id} lookmarkedEvent={item} />
          ))}
        </div>

        {hasMore ? (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              className="w-full max-w-xs"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading more...
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Load more
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            <Eye className="mr-1 inline-block h-4 w-4 opacity-50" />
            That's all the {noun}s.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EmojiBar emojis={emojiBar} selected={selectedEmoji} onSelect={selectEmoji} />
      {content}
    </div>
  );
}
