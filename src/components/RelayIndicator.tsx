import { Radio } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppContext } from '@/hooks/useAppContext';
import { cn } from '@/lib/utils';

export function RelayIndicator() {
  const { config } = useAppContext();
  const relays = config.relayMetadata.relays;
  const readRelays = relays.filter(r => r.read);
  
  // Extract hostname from relay URL for display
  const getRelayHost = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                "hover:bg-emerald-500/20 transition-colors cursor-pointer",
                "border border-emerald-500/20"
              )}
            >
              <Radio className="h-3 w-3" />
              <span className="font-medium">{readRelays.length}</span>
              <span className="hidden sm:inline text-emerald-600/70 dark:text-emerald-400/70">
                {readRelays.length === 1 ? 'relay' : 'relays'}
              </span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Connected relays</p>
        </TooltipContent>
      </Tooltip>
      
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Radio className="h-4 w-4 text-emerald-500" />
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
                <span className="truncate text-muted-foreground">
                  {getRelayHost(relay.url)}
                </span>
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
