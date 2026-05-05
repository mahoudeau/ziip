import { currentImage } from './state/images';
import { DropZone } from './components/DropZone';
import { Editor } from './components/Editor';

export function App() {
  return currentImage.value ? <Editor /> : <DropZone />;
}
