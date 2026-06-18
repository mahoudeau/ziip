import { AuthorMark } from './ui/AuthorMark';
import { GitHubIcon } from './ui/icons';
import { MAKER, REPO_URL, SITE_URL, STREAMLINE_URL, CC_BY_URL } from '../lib/links';
import { canInstall, promptInstall } from '../state/install';

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
          <div class="flex items-center gap-4">
            {canInstall.value && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                class="flex items-center gap-1.5 font-medium text-brand hover:text-brand-strong transition-colors"
              >
                <svg viewBox="0 0 16 16" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M8 2.5v7m0 0 3-3m-3 3-3-3M3.5 13h9" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Install app
              </button>
            )}
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
