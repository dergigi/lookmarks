import { cn } from '@/lib/utils';
import type { EmojiCount } from '@/hooks/useLookmarksFeed';
import type { ReactionEmoji } from '@/nostr/lookmarks';

interface EmojiBarProps {
  emojis: EmojiCount[];
  selected: ReactionEmoji;
  onSelect: (emoji: ReactionEmoji) => void;
}

/** Compact bar of the most-used reaction emojis; clicking one filters the feed. */
export function EmojiBar({ emojis, selected, onSelect }: EmojiBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {emojis.map(({ emoji, count }) => {
        const isSelected = emoji.key === selected.key;
        return (
          <button
            key={emoji.key}
            type="button"
            onClick={() => onSelect(emoji)}
            title={emoji.shortcode ? `:${emoji.shortcode}:` : emoji.key}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition-colors',
              isSelected
                ? 'border-foreground/30 bg-muted text-foreground'
                : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {emoji.url ? (
              <img src={emoji.url} alt={emoji.shortcode ?? ''} className="h-4 w-4 object-contain" />
            ) : (
              <span aria-hidden className="leading-none">
                {emoji.native ?? emoji.key}
              </span>
            )}
            {count > 0 && (
              <span className={cn('text-xs', isSelected ? 'text-foreground/70' : 'text-muted-foreground/70')}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
