import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AuthorAvatarProps {
  src?: string;
  /** Display name, used for the alt text and the initials fallback. */
  name: string;
  className?: string;
}

/** Avatar showing a profile picture, falling back to the name's initials. */
export function AuthorAvatar({ src, name, className }: AuthorAvatarProps) {
  return (
    <Avatar className={cn('h-9 w-9', className)}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
