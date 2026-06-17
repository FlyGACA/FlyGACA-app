import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './i18n';
import './styles/tokens.css';
import './styles/global.css';
import './styles/native.css';
import { router } from './router';
import { initNative } from './lib/native-bridge';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Native shell bootstrap (no-op on the web). Deep links route through the
// same data router the rest of the app uses.
void initNative({ onDeepLink: (path) => void router.navigate(path) });
