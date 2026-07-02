import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { relayHost } from '@/nostr/relays';

interface ConnectedRelaysPillProps {
  relays: string[];
  /** Short description shown in the popover. */
  description?: string;
  className?: string;
}

/** Shows which relays the current feed is being read from. */
export function ConnectedRelaysPill({ relays, description, className }: ConnectedRelaysPillProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 align-baseline text-sm text-muted-foreground',
            'underline decoration-border underline-offset-4 transition-colors',
            'hover:text-foreground hover:decoration-foreground/50',
            'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
        >
          <span className="font-medium text-foreground">{relays.length}</span>
          <span>{relays.length === 1 ? 'relay' : 'relays'}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">Relays</div>
          <div className="text-xs text-muted-foreground">
            {description ?? 'Reading reactions from these relays.'}
          </div>
          <div className="space-y-1 pt-1">
            {relays.map((url) => (
              <div
                key={url}
                className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1.5 text-xs"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="truncate text-muted-foreground">{relayHost(url)}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
