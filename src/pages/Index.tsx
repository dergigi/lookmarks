import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Info, Loader2, Search } from 'lucide-react';
import { nip05, nip19 } from 'nostr-tools';
import { Link, useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LookmarkFeed } from '@/components/LookmarkFeed';

/** Resolves an npub, nprofile, or hex pubkey without any network request. */
function resolvePubkey(input: string): string | null {
  const value = input.trim();
  if (/^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
  try {
    const decoded = nip19.decode(value);
    if (decoded.type === 'npub') return decoded.data;
    if (decoded.type === 'nprofile') return decoded.data.pubkey;
  } catch {
    // not a valid identifier
  }
  return null;
}

/** A bare domain (dergigi.com) or a name@domain NIP-05 address. */
function looksLikeNip05(value: string): boolean {
  return /^(?:[\w.+-]+@)?[\w-]+(?:\.[\w-]+)+$/.test(value);
}

const Index = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Lookmarks — what’s catching people’s eyes on Nostr',
    description:
      'A read-only explorer for Nostr posts marked with 👀 reactions, replies, and quotes.',
  });

  const handleSearch = async () => {
    const value = searchInput.trim();
    if (!value) return;

    const direct = resolvePubkey(value);
    if (direct) {
      setSearchError(null);
      navigate(`/p/${nip19.npubEncode(direct)}`);
      return;
    }

    if (looksLikeNip05(value)) {
      setSearchError(null);
      setSearching(true);
      try {
        const pointer = await nip05.queryProfile(value);
        if (pointer?.pubkey) {
          navigate(`/p/${nip19.npubEncode(pointer.pubkey)}`);
          return;
        }
        setSearchError(`No Nostr address found for ${value}`);
      } catch {
        setSearchError(`Couldn’t resolve ${value}`);
      } finally {
        setSearching(false);
      }
      return;
    }

    setSearchError('Enter an npub, pubkey, or NIP-05 address (e.g. dergigi.com)');
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <span role="img" aria-label="Lookmarks" className="text-xl leading-none">
              👀
            </span>
            <span className="hidden text-base font-semibold tracking-tight sm:inline">
              Lookmarks
            </span>
          </div>

          <div className="relative ml-auto w-44 sm:w-60">
            {searching ? (
              <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              type="text"
              placeholder="npub, NIP-05, pubkey…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={searching}
              aria-label="View a profile’s lookmarks"
              className="h-8 border-transparent bg-muted/50 pl-8 text-sm focus-visible:bg-background"
            />
            {searchError && (
              <p className="absolute right-0 top-9 whitespace-nowrap text-xs text-destructive">
                {searchError}
              </p>
            )}
          </div>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="What are Lookmarks?"
          >
            <Link to="/what">
              <Info className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl px-4 pb-2 pt-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          What’s catching people’s eyes
        </h1>
        <p className="mt-2 text-muted-foreground">
          A “lookmark” is a 👀 reaction, reply, or quote on a note.{' '}
          <Link
            to="/what"
            className="underline decoration-border underline-offset-4 hover:decoration-foreground/50"
          >
            Learn more.
          </Link>
        </p>
      </section>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <LookmarkFeed />
      </main>
    </div>
  );
};

export default Index;
