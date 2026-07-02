import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Heart, MessageSquare, Repeat } from 'lucide-react';

export default function What() {
  useSeoMeta({
    title: 'What are Lookmarks?',
    description:
      'Lookmarks are crowd-sourced bookmarks. When someone reacts to a post with 👀, it means check this out.',
  });

  return (
    <div className="flex flex-1 bg-background">
      <div className="mx-auto max-w-xl px-6 py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-6 text-3xl font-bold tracking-tight">What are Lookmarks?</h1>

        <div className="space-y-6 leading-relaxed text-muted-foreground">
          <p>
            A “lookmark” is when someone reacts to a post with{' '}
            <span className="align-middle text-2xl">👀</span>. It's like a bookmark, but less
            official.
          </p>

          <p>
            To me it's a little note that says “save this” or “hey, check this out” or “I'll have a
            closer look at this later”. It's a signal that something is important, or cool, or worth
            paying attention to. This app collects those signals and shows you the posts people are
            pointing at.
          </p>

          <p>
            Think of it as <span className="font-medium text-foreground">crowd-sourced bookmarks</span>.
          </p>
        </div>

        <hr className="my-10 border-border" />

        <p className="mb-6 text-muted-foreground">This app collects three kinds of lookmarks:</p>

        <div className="space-y-8 text-muted-foreground">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/40 px-2 py-1">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <Heart className="h-3 w-3" />
              </span>
              <h3 className="font-medium text-foreground">Reactions</h3>
            </div>
            <p className="leading-relaxed">
              A{' '}
              <a
                href="https://github.com/nostr-protocol/nips/blob/master/25.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 transition-colors hover:text-primary"
              >
                NIP-25
              </a>{' '}
              reaction (kind 7) with 👀 as the content. Cheap to publish and easy to pull from
              relays, which makes them a reliable signal for “worth a look”.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2 py-1">
                <MessageSquare className="h-3 w-3" />
              </span>
              <h3 className="font-medium text-foreground">Replies</h3>
            </div>
            <p className="leading-relaxed">
              A reply that contains 👀. Someone saw a post, pointed their eyes at it, and left a
              little note in the process.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-2 py-1">
                <Repeat className="h-3 w-3" />
              </span>
              <h3 className="font-medium text-foreground">Quotes</h3>
            </div>
            <p className="leading-relaxed">
              A quote (
              <a
                href="https://github.com/nostr-protocol/nips/blob/master/18.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 transition-colors hover:text-primary"
              >
                NIP-18
              </a>
              ) with 👀, re-sharing a post with an eyes-on stamp.
            </p>
          </div>
        </div>

        <hr className="my-10 border-border" />

        <p className="leading-relaxed text-muted-foreground">
          You can also view all lookmarks from a specific user by visiting their profile. For
          example:{' '}
          <Link
            to="/p/npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc"
            className="break-all text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc
          </Link>
        </p>
      </div>
    </div>
  );
}
