import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { bootI18n } from './i18n';
import './styles/tokens.css';
import './styles/global.css';
import './styles/native.css';
import { router } from './router';
import { initNative } from './lib/native-bridge';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Load only the active language's strings before the first render — no flash of
// untranslated keys, and the other language stays off the boot path.
void bootI18n().then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});

// Native shell bootstrap (no-op on the web). Deep links route through the
// same data router the rest of the app uses.
void initNative({ onDeepLink: (path) => void router.navigate(path) });
