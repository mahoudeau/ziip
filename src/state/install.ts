import { signal } from '@preact/signals';

/** The browser's deferred install prompt (Chromium only; not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PROMPTED_KEY = 'ziip:install-prompted';

function alreadyPrompted(): boolean {
  try {
    return localStorage.getItem(PROMPTED_KEY) === '1';
  } catch {
    return false;
  }
}

function markPrompted(): void {
  try {
    localStorage.setItem(PROMPTED_KEY, '1');
  } catch {
    /* private mode / storage disabled — fine, just won't persist */
  }
}

let deferred: BeforeInstallPromptEvent | null = null;

/** True only when the app is installable AND the user hasn't been prompted yet. */
export const canInstall = signal(false);

window.addEventListener('beforeinstallprompt', (e: Event) => {
  // Stop Chrome's mini-infobar; we surface our own footer button instead.
  e.preventDefault();
  deferred = e as BeforeInstallPromptEvent;
  if (!alreadyPrompted()) canInstall.value = true;
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  canInstall.value = false;
  markPrompted();
});

/** Show the native install prompt once. We never prompt again after this,
 * regardless of the outcome, so it doesn't nag. */
export async function promptInstall(): Promise<void> {
  const e = deferred;
  canInstall.value = false;
  markPrompted();
  if (!e) return;
  await e.prompt();
  await e.userChoice;
  deferred = null;
}
