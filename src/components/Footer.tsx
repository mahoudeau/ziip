import { AuthorMark } from './ui/AuthorMark';
import { GitHubIcon } from './ui/icons';
import { MAKER, REPO_URL, SITE_URL, STREAMLINE_URL, CC_BY_URL } from '../lib/links';

export function Footer() {
  return (
    <footer class="border-t border-border mt-8">
      <div class="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col gap-3 text-sm text-muted">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer noopener"
            class="flex items-center gap-2.5 hover:text-ink transition-colors"
          >
            <AuthorMark class="w-5 h-5" />
            <span>Made by <span class="font-medium text-ink">{MAKER}</span></span>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            class="flex items-center gap-1.5 hover:text-ink transition-colors"
          >
            <GitHubIcon class="w-4 h-4" />
            GitHub
          </a>
        </div>
        <p class="text-xs text-faint text-center sm:text-left">
          Pixel icons by{' '}
          <a href={STREAMLINE_URL} target="_blank" rel="noreferrer noopener" class="underline hover:text-ink transition-colors">
            Streamline
          </a>{' '}
          (
          <a href={CC_BY_URL} target="_blank" rel="noreferrer noopener" class="underline hover:text-ink transition-colors">
            CC BY 4.0
          </a>
          )
        </p>
      </div>
    </footer>
  );
}
