import { Eye, Github } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="max-w-4xl mx-auto px-4 py-6 w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-500" />
            <Link
              to="/what"
              className="underline hover:text-foreground transition-colors"
              aria-label="About Lookmarks"
              title="About"
            >
              About
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <a
              href="https://github.com/dergigi/lookmarks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 underline hover:text-foreground transition-colors"
              aria-label="Lookmarks on GitHub"
              title="Lookmarks on GitHub"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>

            <span className="text-sm text-muted-foreground">
              Prototyped with{' '}
              <a
                href="https://shakespeare.diy/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
                aria-label="Shakespeare (prototype tool)"
                title="Shakespeare"
              >
                Shakespeare
              </a>
            </span>

            <p className="text-sm text-muted-foreground">
              Created by{' '}
              <a
                href="https://dergigi.com/nostr/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Gigi
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


