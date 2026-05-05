import { images, selectedImageId } from './state/images';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';
import { Queue } from './components/Queue';
import { BatchActionBar } from './components/BatchActionBar';
// Side-effect import: registers the global codec/options-change effect.
import './state/encode';

export function App() {
  const items = images.value;
  const selectedId = selectedImageId.value;

  if (items.length === 0) {
    return <DropZone />;
  }

  const inEditor = selectedId !== null;

  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header class="px-6 lg:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
        <h1 class="text-2xl font-bold tracking-tight">Ziip</h1>
      </header>
      <main class="flex-1 px-6 lg:px-8 pb-6">
        {inEditor ? <Editor /> : <Queue />}
      </main>
      <BatchActionBar />
    </div>
  );
}
