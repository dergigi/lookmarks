import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function LookmarksInfoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground shrink-0"
            aria-label="About Lookmarks"
            title="About Lookmarks"
            onClick={() => setOpen(true)}
          >
            <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="font-medium mb-1">What is Lookmarks?</p>
          <p className="text-xs text-muted-foreground">
            A 👀 is a lightweight “bookmark” signal on Nostr. This shows the events people pointed at with 👀.
          </p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-lg">
        <div className="relative overflow-hidden rounded-lg border border-border/40 bg-gradient-to-b from-amber-500/10 via-background to-background">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  👀
                </span>
                Lookmarks, explained
              </DialogTitle>
              <DialogDescription>
                Lookmarks aren’t a special Nostr “thing” — they’re a simple convention: <span className="font-medium text-foreground">someone uses 👀 to point at another event</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-5">
              <div className="text-sm text-muted-foreground leading-relaxed">
                This app collects those 👀 interactions and then shows you the <span className="text-foreground font-medium">original event</span> that got “marked for a look”.
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Kinds of lookmarks</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <div className="mt-0.5 shrink-0 rounded-md bg-muted/50 px-2 py-1 text-xs font-medium text-foreground">
                      Reaction
                    </div>
                    <div>
                      A <span className="font-medium text-foreground">kind:7</span> reaction whose content includes 👀, referencing an event with an <span className="font-medium text-foreground">`e`</span> tag.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-0.5 shrink-0 rounded-md bg-muted/50 px-2 py-1 text-xs font-medium text-foreground">
                      Reply
                    </div>
                    <div>
                      A <span className="font-medium text-foreground">kind:1</span> note that contains 👀 and replies to an event (via an <span className="font-medium text-foreground">`e`</span> tag, often marked <span className="font-medium text-foreground">`reply`</span>).
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="mt-0.5 shrink-0 rounded-md bg-muted/50 px-2 py-1 text-xs font-medium text-foreground">
                      Quote
                    </div>
                    <div>
                      A <span className="font-medium text-foreground">kind:1</span> note that contains 👀 and quotes another event using a <span className="font-medium text-foreground">`q`</span> tag.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
                Tip: results depend on your relays. The app uses NIP-50 search relays to discover 👀 notes, and also does a best-effort scan for 👀 reactions.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


