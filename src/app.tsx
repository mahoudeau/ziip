import { images, selectedImageId } from './state/images';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';
import { Queue } from './components/Queue';
import { BatchActionBar } from './components/BatchActionBar';
import { StatsView } from './components/StatsView';
import { Wordmark } from './components/ui/Logo';

export function App() {
  const items = images.value;
  const selectedId = selectedImageId.value;
  const inEditor = selectedId !== null;
  const hasItems = items.length > 0;

  return (
    <div class="min-h-screen bg-bg text-ink flex flex-col">
      <header class="px-6 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
        <h1 class="text-2xl text-ink">
          <Wordmark />
        </h1>
      </header>
      {!hasItems ? (
        // Home: dropzone hero with the dashboard living directly beneath it.
        <main class="flex-1">
          <DropZone />
          <StatsView />
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
