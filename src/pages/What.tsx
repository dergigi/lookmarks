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

        <h2 className="text-lg font-semibold mb-4">Three types</h2>

        <ul className="space-y-4 text-muted-foreground">
          <li className="flex gap-3">
            <span className="text-foreground font-medium shrink-0">Reaction</span>
            <span>— Someone tapped 👀 on a post</span>
          </li>
          <li className="flex gap-3">
            <span className="text-foreground font-medium shrink-0">Reply</span>
            <span>— Someone replied with 👀 in their message</span>
          </li>
          <li className="flex gap-3">
            <span className="text-foreground font-medium shrink-0">Quote</span>
            <span>— Someone quoted a post and added 👀</span>
          </li>
        </ul>

        <p className="text-sm text-muted-foreground mt-10">
          Built on <a href="https://nostr.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Nostr</a>
        </p>
      </div>
    </div>
  );
}
