import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import '@/index.css';
import { requestPersistentStorage } from '@/db/persist';
import { registerServiceWorker } from '@/pwa/register';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Non-blocking: first render never waits for this.
void requestPersistentStorage();
registerServiceWorker();
