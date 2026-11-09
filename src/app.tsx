import { images, importError, selectedImageId } from './state/images';
import { route } from './state/route';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';
import { Queue } from './components/Queue';
import { BatchActionBar } from './components/BatchActionBar';
import { StatsView } from './components/StatsView';
import { PrivacyPage } from './components/PrivacyPage';
import { AboutPage } from './components/AboutPage';
import { Footer } from './components/Footer';

export function App() {
  const view = route.value;
  const inEditor = selectedImageId.value !== null;
  const hasItems = images.value.length > 0;
  const showBatchBar = view === 'home' && hasItems;

  return (
    <div class="min-h-screen bg-bg text-ink flex flex-col">
      {/* Focuses #main without touching the hash (we use hash routing). */}
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        class="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-brand focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} class="flex-1 outline-none">
        {importError.value && (
          <div role="alert" class="max-w-7xl mx-auto px-6 lg:px-8 pt-3">
            <p class="flex items-start justify-between gap-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">
              <span>{importError.value}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => {
                  importError.value = null;
                }}
                class="shrink-0 hover:text-ink transition-colors"
              >
                ✕
              </button>
            </p>
          </div>
        )}
        {view === 'dashboard' ? (
          <StatsView asPage />
        ) : view === 'privacy' ? (
          <PrivacyPage />
        ) : view === 'about' ? (
          <AboutPage />
        ) : hasItems ? (
          <div class="px-6 lg:px-8 pb-6">{inEditor ? <Editor /> : <Queue />}</div>
        ) : (
          <>
            <DropZone />
            <StatsView />
          </>
        )}
      </main>
      {showBatchBar && <BatchActionBar />}
      {/* Footer shows everywhere (credits + install button). On the queue/editor
          it sits below the sticky batch bar, reachable at the bottom of the page. */}
      <Footer />
    </div>
  );
}
