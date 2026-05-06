import { useState } from 'preact/hooks';
import { images, selectedImageId } from './state/images';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';
import { Queue } from './components/Queue';
import { BatchActionBar } from './components/BatchActionBar';
import { StatsView } from './components/StatsView';

export function App() {
  const items = images.value;
  const selectedId = selectedImageId.value;
  const inEditor = selectedId !== null;
  const hasItems = items.length > 0;
  const [showingStats, setShowingStats] = useState(false);

  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header class="px-6 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
        <h1 class="text-2xl font-bold tracking-tight">Ziip</h1>
        <button
          type="button"
          onClick={() => setShowingStats((v) => !v)}
          class={`px-3 py-1.5 text-sm rounded transition-colors ${
            showingStats
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          Stats
        </button>
      </header>
      {showingStats ? (
        <main class="flex-1">
          <StatsView onClose={() => setShowingStats(false)} />
        </main>
      ) : !hasItems ? (
        <main class="flex-1">
          <DropZone />
        </main>
      ) : (
        <>
          <main class="flex-1 px-6 lg:px-8 pb-6">
            {inEditor ? <Editor /> : <Queue />}
          </main>
          <BatchActionBar />
        </>
      )}
    </div>
  );
}
