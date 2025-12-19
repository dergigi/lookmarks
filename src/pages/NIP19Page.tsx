import { nip19 } from 'nostr-tools';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobileScreen } from '@fortawesome/free-solid-svg-icons';
import NotFound from './NotFound';
import { LookmarkEventsFeed } from '@/components/LookmarkEventsFeed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { useAuthor } from '@/hooks/useAuthor';
import { useEvent } from '@/hooks/useEvent';
import { useAddressableEvent } from '@/hooks/useAddressableEvent';
import { genUserName } from '@/lib/genUserName';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();
  const navigate = useNavigate();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      return (
        <PageShell onBack={() => navigate('/')}>
          <ProfileLookmarksView pubkey={type === 'npub' ? (data as string) : (data as { pubkey: string }).pubkey} />
        </PageShell>
      );

    case 'note':
      return (
        <PageShell onBack={() => navigate('/')}>
          <EventView
            eventId={data as string}
            nip19Id={identifier}
            kindHint="note"
          />
        </PageShell>
      );

    case 'nevent':
      return (
        <PageShell onBack={() => navigate('/')}>
          <EventView
            eventId={(data as { id: string }).id}
            nip19Id={identifier}
            kindHint="nevent"
          />
        </PageShell>
      );

    case 'naddr':
      return (
        <PageShell onBack={() => navigate('/')}>
          <AddressableEventView
            kind={(data as { kind: number }).kind}
            pubkey={(data as { pubkey: string }).pubkey}
            identifier={(data as { identifier: string }).identifier}
            nip19Id={identifier}
          />
        </PageShell>
      );

    default:
      return <NotFound />;
  }
}

function PageShell({ onBack, children }: { onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-amber-500/5">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 w-full">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back" title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
    </div>
  );
}

function ProfileLookmarksView({ pubkey }: { pubkey: string }) {
  const npub = nip19.npubEncode(pubkey);
  const author = useAuthor(pubkey);

  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);
  const avatar = author.data?.metadata?.picture;
  const nip05 = author.data?.metadata?.nip05;
  const npubShort = `${npub.slice(0, 12)}…${npub.slice(-8)}`;

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {author.isLoading ? (
              <Skeleton className="h-12 w-12 rounded-full" />
            ) : (
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatar} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground truncate">{displayName}</div>
              {nip05 ? (
                <div className="text-xs text-muted-foreground truncate">{nip05}</div>
              ) : (
                <div className="text-xs text-muted-foreground truncate">{npubShort}</div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => window.open(`https://njump.to/${npub}`, '_blank', 'noopener,noreferrer')}
                aria-label="Open profile in njump.to"
                title="Open profile in njump.to"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => window.open(`nostr:${npub}`, '_self')}
                aria-label="Open profile in your Nostr client"
                title="Open profile in your Nostr client"
              >
                <FontAwesomeIcon icon={faMobileScreen} className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            Lookmarks by <span className="font-medium text-foreground">@{displayName}</span>
          </div>
        </CardContent>
      </Card>

      <LookmarkEventsFeed pubkey={pubkey} />
    </div>
  );
}

function EventView({ eventId, nip19Id }: { eventId: string; nip19Id: string; kindHint: 'note' | 'nevent' }) {
  const { data: event, isLoading, isError } = useEvent(eventId);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!event || isError) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4" />
            Event not found
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <a
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            href={`https://njump.to/${nip19Id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Open via njump.to
          </a>
        </CardContent>
      </Card>
    );
  }

  return <EventCard event={event} nip19Id={nip19Id} />;
}

function AddressableEventView({
  kind,
  pubkey,
  identifier,
  nip19Id,
}: {
  kind: number;
  pubkey: string;
  identifier: string;
  nip19Id: string;
}) {
  const { data: event, isLoading, isError } = useAddressableEvent(kind, pubkey, identifier);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-5/6 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!event || isError) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="text-sm font-medium">Addressable event not found</div>
        </CardHeader>
        <CardContent className="pt-0">
          <a
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            href={`https://njump.to/${nip19Id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
            Open via njump.to
          </a>
        </CardContent>
      </Card>
    );
  }

  return <EventCard event={event} nip19Id={nip19Id} />;
}

function EventCard({ event, nip19Id }: { event: NostrEvent; nip19Id: string }) {
  const author = useAuthor(event.pubkey);
  const displayName = author.data?.metadata?.name ?? genUserName(event.pubkey);
  const avatar = author.data?.metadata?.picture;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold text-foreground truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(event.created_at * 1000).toLocaleString()}
              </div>
            </div>
          </div>

          <a
            href={`https://njump.to/${nip19Id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Open in njump.to"
          >
            <ExternalLink className="h-4 w-4" />
            njump.to
          </a>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="text-sm text-foreground/90">
          <NoteContent event={event} className="whitespace-pre-wrap break-words" />
        </div>
      </CardContent>
    </Card>
  );
}