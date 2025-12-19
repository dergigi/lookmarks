import { cn } from '@/lib/utils';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RelaySource } from '@/contexts/AppContext';

function getRelayHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Color and label for each relay source */
const sourceConfig: Record<RelaySource | 'default', { color: string; label: string }> = {
  user: { color: 'bg-emerald-500', label: 'Your relay' },
  fallback: { color: 'bg-amber-500', label: 'Fallback' },
  search: { color: 'bg-blue-500', label: 'Discovery' },
  default: { color: 'bg-emerald-500', label: '' },
};

export function ConnectedRelaysPill({ className }: { className?: string }) {
  const { config } = useAppContext();
  const { user } = useCurrentUser();
  const relays = config.relayMetadata.relays;
  const readRelays = relays.filter(r => r.read);

  // Count relays by source
  const userRelays = readRelays.filter(r => !r.source || r.source === 'user');
  const fallbackRelays = readRelays.filter(r => r.source === 'fallback');
  const searchRelays = readRelays.filter(r => r.source === 'search');

  const hasFallbacks = fallbackRelays.length > 0;
  const isLoggedIn = !!user;

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
              {isLoggedIn && hasFallbacks && (
                <span className="text-amber-500 text-xs ml-0.5" title="Using fallback relays">+fallbacks</span>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isLoggedIn ? 'Your relays + discovery helpers' : 'Connected relays'}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span>Connected Relays</span>
          </div>

          {isLoggedIn && hasFallbacks && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-2 py-1.5">
              Using fallback relays to help find events your relays may not have.
            </div>
          )}

          {/* User relays */}
          {userRelays.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                {isLoggedIn ? 'Your Relays' : 'Default Relays'} ({userRelays.length})
              </div>
              {userRelays.map((relay) => (
                <RelayRow key={relay.url} url={relay.url} source={relay.source} />
              ))}
            </div>
          )}

          {/* Search relays */}
          {searchRelays.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                Discovery Relays ({searchRelays.length})
              </div>
              {searchRelays.map((relay) => (
                <RelayRow key={relay.url} url={relay.url} source={relay.source} />
              ))}
            </div>
          )}

          {/* Fallback relays */}
          {fallbackRelays.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                Fallback Relays ({fallbackRelays.length})
              </div>
              {fallbackRelays.map((relay) => (
                <RelayRow key={relay.url} url={relay.url} source={relay.source} />
              ))}
            </div>
          )}

          <div className="pt-2 text-[10px] text-muted-foreground/70 border-t border-border/50">
            {isLoggedIn
              ? 'Fallback & discovery relays are read-only'
              : 'Log in to use your own relay list'}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RelayRow({ url, source }: { url: string; source?: RelaySource }) {
  const cfg = sourceConfig[source ?? 'default'];
  return (
    <div className="flex items-center gap-2 text-xs py-1.5 px-2 rounded bg-muted/50">
      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.color)} />
      <span className="truncate text-muted-foreground flex-1">{getRelayHost(url)}</span>
    </div>
  );
}


