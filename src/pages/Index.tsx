import { useEffect, useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Eye, Search, Globe, User } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LoginArea } from '@/components/auth/LoginArea';
import { LookmarkFeed } from '@/components/LookmarkFeed';
import { RelayIndicator } from '@/components/RelayIndicator';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
  const [searchedPubkey, setSearchedPubkey] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'global' | 'user' | 'mine'>('global');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const { user } = useCurrentUser();
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
    title: 'Lookmarks - Discover 👀 Reactions on Nostr',
    description: 'Explore events that caught people\'s attention with 👀 reactions. A read-only Nostr client for discovering interesting content.',
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
      setSearchedPubkey(pubkey);
      setActiveTab('user');
      setSearchError(null);
      if (trimmed.length === 0 && placeholderNpub) {
        setSearchInput(placeholderNpub);
      }
    } else {
      setSearchError('Invalid npub or pubkey format');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleViewMyLookmarks = () => {
    if (user) {
      setActiveTab('mine');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-amber-500/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 w-full">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-[10px] animate-pulse">
                  👀
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Lookmarks
                </h1>
                <p className="text-xs text-muted-foreground truncate">Discover what's catching eyes</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RelayIndicator />

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
              Discover What’s{' '}
              <span className="inline-flex items-center gap-1">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Catching Eyes</span>
              </span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A feed of things that people found interesting enough to throw some eyes on it.
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

            {user && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewMyLookmarks}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View my lookmarks
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'global' | 'user' | 'mine')}>
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-8">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Global</span>
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2" disabled={!searchedPubkey}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">User</span>
            </TabsTrigger>
            <TabsTrigger value="mine" className="flex items-center gap-2" disabled={!user}>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Mine</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-0">
            <LookmarkFeed />
          </TabsContent>

          <TabsContent value="user" className="mt-0">
            {searchedPubkey ? (
              <LookmarkFeed pubkey={searchedPubkey} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Search for a user to see their lookmarks</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-0">
            {user ? (
              <LookmarkFeed pubkey={user.pubkey} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Log in to see your own lookmarks</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" />
              <span>Lookmarks - A read-only Nostr client</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://shakespeare.diy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Vibed with Shakespeare
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
