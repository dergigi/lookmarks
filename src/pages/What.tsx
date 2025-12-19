import { useSeoMeta } from '@unhead/react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function What() {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'What are Lookmarks?',
    description: 'Learn what Lookmarks are and the different kinds: reactions, replies, and quoted events.',
  });

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
                  <h2 className="text-xl font-semibold">Lookmarks, in plain English</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    A Lookmark is basically a <span className="font-medium text-foreground">“save this / check this out”</span> signal.
                    Someone drops a <span className="font-medium text-foreground">👀</span> while pointing at a post.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3">
                <div className="text-sm text-muted-foreground leading-relaxed">
                  This app collects those “👀 pointers” and shows you the <span className="font-medium text-foreground">original post</span> that got marked.
                  Think of it as <span className="font-medium text-foreground">crowd‑sourced bookmarks</span>.
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground leading-relaxed">
                  If you don’t see many results, it usually just means your relays didn’t return them yet.
                  Logging in lets you use your own relay list.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <h2 className="text-lg font-semibold">The 3 kinds of Lookmarks</h2>
              <p className="text-sm text-muted-foreground">Same idea, different ways of “pointing” at a post.</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4">
                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">1) Reaction</div>
                      <div className="text-sm text-muted-foreground">They reacted to a post with 👀.</div>
                    </div>
                    <div className="shrink-0 text-lg leading-none">👀</div>
                  </div>
                  <Separator className="my-3" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Example: someone taps 👀 on a post to say “worth a look”.
                  </div>
                  <Accordion type="single" collapsible className="mt-3">
                    <AccordionItem value="reaction-tech">
                      <AccordionTrigger className="text-sm">Details (technical)</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        In Nostr terms this is usually a <span className="font-medium text-foreground">kind:7</span> reaction whose content includes 👀,
                        referencing the target via an <span className="font-medium text-foreground">`e`</span> tag.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">2) Reply</div>
                      <div className="text-sm text-muted-foreground">They replied with 👀 (to point back at the post).</div>
                    </div>
                    <div className="shrink-0 text-lg leading-none">💬</div>
                  </div>
                  <Separator className="my-3" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Example: “👀 this explains it” as a reply under the original post.
                  </div>
                  <Accordion type="single" collapsible className="mt-3">
                    <AccordionItem value="reply-tech">
                      <AccordionTrigger className="text-sm">Details (technical)</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        This is a <span className="font-medium text-foreground">kind:1</span> note that contains 👀 and references the target via an
                        <span className="font-medium text-foreground"> `e`</span> tag (often marked as a <span className="font-medium text-foreground">reply</span>).
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">3) Quoted event</div>
                      <div className="text-sm text-muted-foreground">They wrote a new note that quotes another post and adds 👀.</div>
                    </div>
                    <div className="shrink-0 text-lg leading-none">❝</div>
                  </div>
                  <Separator className="my-3" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Example: “👀 quoting this because it’s important”.
                  </div>
                  <Accordion type="single" collapsible className="mt-3">
                    <AccordionItem value="quote-tech">
                      <AccordionTrigger className="text-sm">Details (technical)</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        This is a <span className="font-medium text-foreground">kind:1</span> note that contains 👀 and points at the target using a
                        <span className="font-medium text-foreground"> `q`</span> tag.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


