import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Info, Search } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { Link, useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LookmarkFeed } from '@/components/LookmarkFeed';

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

const Index = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Lookmarks — what’s catching people’s eyes on Nostr',
    description: 'A read-only explorer for Nostr posts marked with 👀 reactions.',
  });

  const handleSearch = () => {
    const pubkey = resolvePubkey(searchInput);
    if (!pubkey) {
      setSearchError('Enter a valid npub or pubkey');
      return;
    }
    setSearchError(null);
    navigate(`/p/${nip19.npubEncode(pubkey)}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span role="img" aria-label="Lookmarks" className="text-xl leading-none">
              👀
            </span>
            <span className="text-base font-semibold tracking-tight">Lookmarks</span>
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="What are Lookmarks?">
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
          A “lookmark” is a 👀 reaction on a note.{' '}
          <Link
            to="/what"
            className="underline decoration-border underline-offset-4 hover:decoration-foreground/50"
          >
            Learn more.
          </Link>
        </p>

        <div className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="View a profile’s lookmarks (npub or pubkey)"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setSearchError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-11 pl-10"
            />
          </div>
          <Button onClick={handleSearch} className="h-11" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {searchError && <p className="mt-2 text-sm text-destructive">{searchError}</p>}
      </section>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <LookmarkFeed />
      </main>
    </div>
  );
};

export default Index;
