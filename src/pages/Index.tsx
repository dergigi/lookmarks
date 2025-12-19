import { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Search } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { nip19 } from 'nostr-tools';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LoginArea } from '@/components/auth/LoginArea';
import { LookmarkFeed } from '@/components/LookmarkFeed';
import { useLookmarks } from '@/hooks/useLookmarks';

function isValidPubkey(input: string): string | null {
  // Check if it's already a hex pubkey
  if (/^[0-9a-f]{64}$/i.test(input)) {
    return input.toLowerCase();
  }

  // Try to decode as npub
  try {
    const decoded = nip19.decode(input);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    if (decoded.type === 'nprofile') {
      return decoded.data.pubkey;
    }
  } catch {
    // Not a valid npub/nprofile
  }

  return null;
}

const Index = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const navigate = useNavigate();

  const globalLookmarks = useLookmarks();

  const recentLookmarkerNpubs = useMemo((): string[] => {
    const firstPage = globalLookmarks.data?.pages?.[0]?.lookmarkedEvents;
    if (!firstPage?.length) return [];

    const lookmarkEvents = firstPage.flatMap((item) => item.lookmarks);
    lookmarkEvents.sort((a, b) => b.created_at - a.created_at);

    const seen = new Set<string>();
    const npubs: string[] = [];

    for (const ev of lookmarkEvents) {
      if (!ev.pubkey || seen.has(ev.pubkey)) continue;
      seen.add(ev.pubkey);

      try {
        npubs.push(nip19.npubEncode(ev.pubkey));
      } catch {
        // ignore invalid pubkeys
      }

      if (npubs.length >= 8) break;
    }

    return npubs;
  }, [globalLookmarks.data?.pages]);

  useEffect(() => {
    setPlaceholderIndex(0);
  }, [recentLookmarkerNpubs]);

  useEffect(() => {
    const shouldRotate =
      !isSearchFocused &&
      searchInput.trim().length === 0 &&
      recentLookmarkerNpubs.length > 1;

    if (!shouldRotate) return;

    const id = window.setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % recentLookmarkerNpubs.length);
    }, 2500);

    return () => window.clearInterval(id);
  }, [isSearchFocused, recentLookmarkerNpubs.length, searchInput]);

  const placeholderText =
    recentLookmarkerNpubs.length > 0
      ? recentLookmarkerNpubs[placeholderIndex % recentLookmarkerNpubs.length]
      : 'Enter npub or pubkey to see their lookmarks...';

  const placeholderNpub =
    recentLookmarkerNpubs.length > 0
      ? recentLookmarkerNpubs[placeholderIndex % recentLookmarkerNpubs.length]
      : null;

  useSeoMeta({
    title: 'Lookmarks - Find What’s Catching People’s Eyes',
    description:
      'Find what’s catching people’s eyes on Nostr — events marked with 👀 reactions, replies, or quotes. A read-only client for discovering interesting content.',
  });

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    const searchTerm = trimmed.length > 0 ? trimmed : placeholderNpub;

    if (!searchTerm) {
      setSearchError('Please enter an npub or pubkey');
      return;
    }

    const pubkey = isValidPubkey(searchTerm);
    if (pubkey) {
      setSearchError(null);
      if (trimmed.length === 0 && placeholderNpub) {
        setSearchInput(placeholderNpub);
      }
      navigate(`/p/${nip19.npubEncode(pubkey)}`);
    } else {
      setSearchError('Invalid npub or pubkey format');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-background via-background to-amber-500/5">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 w-full">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-rose-500/20 blur-md"
                  />
                  <span role="img" aria-label="Lookmarks" className="relative text-2xl leading-none">
                    👀
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Lookmarks
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <LoginArea className="max-w-60" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground shrink-0"
                    aria-label="What are Lookmarks?"
                    title="What are Lookmarks?"
                  >
                    <Link to="/what">
                      <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="font-medium mb-1">What is Lookmarks?</p>
                  <p className="text-xs text-muted-foreground">
                    Shows events that have been marked with 👀 emoji reactions, replies, or quotes.
                    A way to bookmark interesting content on Nostr! Log in to use your own relays.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.15),transparent_50%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 py-12 relative w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Find What’s{' '}
              <span className="inline-flex items-center gap-1">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Catching People’s Eyes
                </span>
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A “lookmark” is any 👀 reaction to a note. It’s like a bookmark, but less official.
              {' '}
              <Link
                to="/what"
                className="font-medium underline underline-offset-4 decoration-border hover:decoration-foreground/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 rounded-sm"
              >
                Learn more.
              </Link>
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={placeholderText}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSearchError(null);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 h-11 bg-background/50 border-border/50 focus:border-amber-500/50 focus:ring-amber-500/20"
                />
              </div>
              <Button
                onClick={handleSearch}
                aria-label="Search lookmarks"
                title="Search lookmarks"
                className="h-11 w-11 p-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 shrink-0"
              >
                <span className="text-lg leading-none">👀</span>
              </Button>
            </div>
            {searchError && (
              <p className="text-xs text-destructive mt-2 text-center">{searchError}</p>
            )}

          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <LookmarkFeed />
      </main>
    </div>
  );
};

export default Index;
