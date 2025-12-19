import { useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type LookmarkType = {
  title: string;
  subtitle: string;
  howItWorks: string;
  tags: string[];
};

export default function What() {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'What are Lookmarks?',
    description: 'Learn what Lookmarks are and the different kinds: reactions, replies, and quoted events.',
  });

  const lookmarkTypes = useMemo<LookmarkType[]>(
    () => [
      {
        title: 'Reaction',
        subtitle: 'A quick 👀 on an event',
        howItWorks:
          'A kind:7 reaction whose content includes 👀, referencing an event via an `e` tag.',
        tags: ['kind:7', '👀', '`e` tag'],
      },
      {
        title: 'Reply',
        subtitle: 'A note that points back at something',
        howItWorks:
          'A kind:1 note that contains 👀 and replies to an event (via an `e` tag, often marked as `reply`).',
        tags: ['kind:1', '👀', '`e` tag', '`reply` marker'],
      },
      {
        title: 'Quoted event',
        subtitle: 'A note that quotes another event',
        howItWorks:
          'A kind:1 note that contains 👀 and quotes another event using a `q` tag.',
        tags: ['kind:1', '👀', '`q` tag'],
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-amber-500/5">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">Lookmarks</div>
              <h1 className="text-lg font-semibold leading-tight">What are Lookmarks?</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 w-full">
        <div className="grid gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-xl leading-none">👀</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">A lightweight “bookmark” signal</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    A Lookmark is not a special Nostr object. It’s a simple convention:
                    someone uses <span className="font-medium text-foreground">👀</span> while
                    referencing another event. This app collects those interactions and then
                    shows you the original event that got “marked for a look”.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground leading-relaxed">
                Discovery depends on relays. Lookmarks uses NIP-50 search relays to find 👀
                notes, and also does a best-effort scan for 👀 reactions.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">Kinds of lookmarks</h2>
              <p className="text-sm text-muted-foreground">
                These are the three interaction patterns Lookmarks currently recognizes.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4">
                {lookmarkTypes.map((t) => (
                  <div
                    key={t.title}
                    className="rounded-xl border border-border/50 bg-background/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-sm text-muted-foreground">{t.subtitle}</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {t.howItWorks}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


