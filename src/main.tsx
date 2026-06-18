import { render } from 'preact';
import { App } from './app';
import '@fontsource-variable/fredoka';
import './styles/globals.css';

const root = document.getElementById('app');
if (!root) throw new Error('No #app element found in index.html');
render(<App />, root);
