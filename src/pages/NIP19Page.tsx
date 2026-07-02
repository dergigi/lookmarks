import { nip19 } from 'nostr-tools';
import { Link, useParams } from 'react-router-dom';
import { use$ } from 'applesauce-react/hooks';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { NostrEvent } from 'nostr-tools';

import NotFound from './NotFound';
import { LookmarkFeed } from '@/components/LookmarkFeed';
import { NoteBody } from '@/components/NoteBody';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/hooks/useProfile';
import { eventStore } from '@/nostr/core';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) return <NotFound />;

  let decoded: nip19.DecodeResult;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  switch (decoded.type) {
    case 'npub':
      return (
        <PageShell>
          <ProfileView pubkey={decoded.data} />
        </PageShell>
      );
    case 'nprofile':
      return (
        <PageShell>
          <ProfileView pubkey={decoded.data.pubkey} />
        </PageShell>
      );
    case 'note':
      return (
        <PageShell>
          <EventView pointer={{ id: decoded.data }} nip19Id={identifier} />
        </PageShell>
      );
    case 'nevent':
      return (
        <PageShell>
          <EventView pointer={{ id: decoded.data.id }} nip19Id={identifier} />
        </PageShell>
      );
    case 'naddr':
      return (
        <PageShell>
          <AddressableView
            kind={decoded.data.kind}
            pubkey={decoded.data.pubkey}
            identifier={decoded.data.identifier}
            nip19Id={identifier}
          />
        </PageShell>
      );
    default:
      return <NotFound />;
  }
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

function ProfileView({ pubkey }: { pubkey: string }) {
  const npub = nip19.npubEncode(pubkey);
  const { displayName, picture, nip05 } = useProfile(pubkey);
  const npubShort = `${npub.slice(0, 12)}…${npub.slice(-6)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={picture} alt={displayName} />
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-foreground">{displayName}</div>
          <div className="truncate text-sm text-muted-foreground">{nip05 ?? npubShort}</div>
        </div>
        <a
          href={`https://njump.me/${npub}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Open profile in njump.me"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <LookmarkFeed pubkey={pubkey} />
    </div>
  );
}

function EventView({ pointer, nip19Id }: { pointer: { id: string }; nip19Id: string }) {
  const event = use$(() => eventStore.event(pointer.id), [pointer.id]);
  return <EventCard event={event} nip19Id={nip19Id} />;
}

function AddressableView({
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
  const event = use$(
    () => eventStore.replaceable(kind, pubkey, identifier),
    [kind, pubkey, identifier],
  );
  return <EventCard event={event} nip19Id={nip19Id} />;
}

function EventCard({ event, nip19Id }: { event: NostrEvent | undefined; nip19Id: string }) {
  const author = useProfile(event?.pubkey);

  if (event === undefined) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <a
          href={`https://njump.me/${nip19Id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Open via njump.me
        </a>
      </div>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={author.picture} alt={author.displayName} />
          <AvatarFallback>{author.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-foreground">{author.displayName}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(event.created_at * 1000).toLocaleString()}
          </div>
        </div>
        <a
          href={`https://njump.me/${nip19Id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Open in njump.me"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <NoteBody event={event} className="text-sm text-foreground/90" />
    </article>
  );
}

export default NIP19Page;
