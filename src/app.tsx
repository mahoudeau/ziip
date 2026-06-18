import { images, selectedImageId } from './state/images';
import { route } from './state/route';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';
import { Queue } from './components/Queue';
import { BatchActionBar } from './components/BatchActionBar';
import { StatsView } from './components/StatsView';
import { PrivacyPage } from './components/PrivacyPage';
import { AboutPage } from './components/AboutPage';

export function App() {
  const view = route.value;
  const inEditor = selectedImageId.value !== null;
  const hasItems = images.value.length > 0;
  const showBatchBar = view === 'home' && hasItems;

  return (
    <div class="min-h-screen bg-bg text-ink flex flex-col">
      <Header />
      <main class="flex-1">
        {view === 'dashboard' ? (
          <StatsView />
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
    </div>
  );
}
