import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function What() {
  useSeoMeta({
    title: 'What are Lookmarks?',
    description: 'Lookmarks are crowd-sourced bookmarks. When someone reacts to a post with 👀, it means check this out.',
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-6">
          What are Lookmarks?
        </h1>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            A Lookmark is when someone reacts to a post with <span className="text-2xl align-middle">👀</span>
          </p>

          <p>
            It's a "save this" or "check this out" signal. This app collects those signals and shows you the posts people are pointing at.
          </p>

          <p>
            Think of it as <span className="text-foreground font-medium">crowd-sourced bookmarks</span>.
          </p>
        </div>

        <hr className="my-10 border-border" />

        <h2 className="text-lg font-semibold mb-6">Three types</h2>

        <div className="space-y-8 text-muted-foreground">
          <div>
            <h3 className="text-foreground font-medium mb-2">Reaction</h3>
            <p className="leading-relaxed">
              The most common type. Someone taps the 👀 emoji as a reaction to a post, like a "like" but specifically meaning "worth a look". Under the hood, this is a{' '}
              <a
                href="https://github.com/nostr-protocol/nips/blob/master/25.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
              >
                NIP-25
              </a>{' '}
              reaction event (kind 7) with 👀 as the content.
            </p>
          </div>

          <div>
            <h3 className="text-foreground font-medium mb-2">Reply</h3>
            <p className="leading-relaxed">
              Someone replies to a post and includes 👀 in their message—usually to highlight the parent post to their followers. This uses{' '}
              <a
                href="https://github.com/nostr-protocol/nips/blob/master/10.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
              >
                NIP-10
              </a>{' '}
              threading: a kind 1 note with an <code className="text-xs bg-muted px-1.5 py-0.5 rounded">e</code> tag pointing to the original.
            </p>
          </div>

          <div>
            <h3 className="text-foreground font-medium mb-2">Quote</h3>
            <p className="leading-relaxed">
              Someone writes a new post that embeds another post and adds 👀. This is the "retweet with comment" pattern. Technically a kind 1 note with a{' '}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">q</code> tag, as defined in{' '}
              <a
                href="https://github.com/nostr-protocol/nips/blob/master/18.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
              >
                NIP-18
              </a>
              .
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-10">
          Built on <a href="https://nostr.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Nostr</a>
        </p>
      </div>
    </div>
  );
}
