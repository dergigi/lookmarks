import { cn } from '@/lib/utils';
import { useAppContext } from '@/hooks/useAppContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function getRelayHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function ConnectedRelaysPill({ className }: { className?: string }) {
  const { config } = useAppContext();
  const relays = config.relayMetadata.relays;
  const readRelays = relays.filter(r => r.read);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1 text-sm',
                'align-baseline',
                'text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
                'underline underline-offset-4 decoration-border hover:decoration-foreground/50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 rounded-sm',
                className,
              )}
            >
              <span className="font-medium text-foreground">{readRelays.length}</span>
              <span>{readRelays.length === 1 ? 'relay' : 'relays'}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Connected relays</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span>Connected Relays</span>
          </div>

          <div className="text-xs text-muted-foreground">
            Reading lookmarks from {readRelays.length} {readRelays.length === 1 ? 'relay' : 'relays'}
          </div>

          <div className="space-y-1 pt-1">
            {readRelays.map((relay) => (
              <div
                key={relay.url}
                className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-muted/50"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate text-muted-foreground">{getRelayHost(relay.url)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[10px] text-muted-foreground/70 border-t border-border/50">
            Log in to use your own relay list
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}


