import type { ComponentChildren } from 'preact';
import { REPO_URL } from '../lib/links';
import { GitHubIcon } from './ui/icons';

export function PrivacyPage() {
  return (
    <div class="px-6 lg:px-8 pt-4 pb-16 max-w-3xl mx-auto">
      <h2 class="text-3xl font-display font-semibold tracking-tight mb-3">Your privacy</h2>
      <p class="text-muted text-lg mb-8">
        Ziip is 100% private by design. Your images are compressed entirely on your own
        device. They’re never uploaded, and there’s no server to upload them to.
      </p>

      <Section title="In plain terms">
        <ul class="space-y-2.5 text-muted">
          <Li>Your files never leave your device. No uploads, ever.</Li>
          <Li>There’s no backend, no account, and no sign-in.</Li>
          <Li>No analytics, no tracking, no cookies.</Li>
          <Li>After the first load, it keeps working offline.</Li>
        </ul>
      </Section>

      <Section title="How it works (the technical bit)">
        <ul class="space-y-2.5 text-muted">
          <Li>
            All compression runs in your browser via WebAssembly codecs (a maintained fork
            of Squoosh’s), on background Web Workers.
          </Li>
          <Li>
            HEIC/HEIF photos are decoded locally with a WebAssembly build of libheif. Still
            no upload.
          </Li>
          <Li>
            The only network request is the initial download of the app itself (HTML, JS,
            CSS, Wasm). After that, nothing is sent anywhere.
          </Li>
          <Li>
            Your presets and stats live only in this browser’s localStorage, and are never
            transmitted.
          </Li>
        </ul>
      </Section>

      <Section title="Don’t take our word for it">
        <p class="text-muted mb-4">
          Ziip is open source. You can read exactly what runs. There’s nowhere for your
          images to go.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          class="inline-flex items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3 hover:border-brand/50 transition-colors"
        >
          <GitHubIcon class="w-6 h-6 text-ink" />
          <span>
            <span class="block font-medium text-ink">View the source on GitHub</span>
            <span class="block text-sm text-faint">github.com/mahoudeau/ziip</span>
          </span>
        </a>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="bg-surface rounded-2xl p-6 shadow-sm mb-4">
      <h3 class="font-display font-semibold text-lg mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Li({ children }: { children: ComponentChildren }) {
  return (
    <li class="flex gap-2.5">
      <span class="text-brand mt-0.5 shrink-0" aria-hidden="true">✓</span>
      <span>{children}</span>
    </li>
  );
}
