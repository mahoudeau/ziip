import { render } from 'preact';
import { effect } from '@preact/signals';
import { App } from './app';
import { route } from './state/route';
import { applyRouteMeta } from './lib/meta';
import '@fontsource-variable/fredoka';
import './styles/globals.css';

// Keep the tab title, description, and robots directive in sync with the route.
effect(() => applyRouteMeta(route.value));

const root = document.getElementById('app');
if (!root) throw new Error('No #app element found in index.html');
render(<App />, root);
