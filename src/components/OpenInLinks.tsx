import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBugs, faGlobe, faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

import { antsUrl, njumpUrl, nostrUri, type NostrLinkType } from '@/lib/nostrLinks';
import { cn } from '@/lib/utils';

interface OpenInLinksProps {
  /** A NIP-19 identifier (npub, nprofile, note, nevent, naddr…). */
  id: string;
  type: NostrLinkType;
  className?: string;
}

const linkClass = 'text-muted-foreground transition-colors hover:text-foreground';
const iconClass = 'h-3.5 w-3.5';

/** Buttons to open a Nostr entity in njump.to, ants.sh, or the native app. */
export function OpenInLinks({ id, type, className }: OpenInLinksProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <a
        href={njumpUrl(id)}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in njump.to"
        className={linkClass}
      >
        <FontAwesomeIcon icon={faGlobe} className={iconClass} />
      </a>
      <a
        href={antsUrl(id, type)}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in ants.sh"
        className={linkClass}
      >
        <FontAwesomeIcon icon={faBugs} className={iconClass} />
      </a>
      <a href={nostrUri(id)} title="Open in native app" className={linkClass}>
        <FontAwesomeIcon icon={faUpRightFromSquare} className={iconClass} />
      </a>
    </div>
  );
}
