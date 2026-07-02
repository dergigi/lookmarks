import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';

import { njumpUrl } from '@/lib/nostrLinks';

interface NjumpLinkProps {
  /** A NIP-19 identifier (npub, nevent, note, naddr…). */
  id: string;
  className?: string;
  title?: string;
  children?: ReactNode;
}

/** External link to njump.to, defaulting to an icon when no children are given. */
export function NjumpLink({ id, className, title = 'Open in njump.to', children }: NjumpLinkProps) {
  return (
    <a
      href={njumpUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={title}
    >
      {children ?? <ExternalLink className="h-4 w-4" />}
    </a>
  );
}
