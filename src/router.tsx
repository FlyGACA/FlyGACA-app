import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './app/Layout';
import { Home } from './pages/Home/Home';
import { ToolsIndex } from './pages/tools/ToolsIndex';
import { Crosswind } from './pages/tools/Crosswind';
import { DensityAltitude } from './pages/tools/DensityAltitude';
import { Tas } from './pages/tools/Tas';
import { Library } from './pages/library/Library';
import { Document } from './pages/library/Document';
import { Chat } from './pages/chat/Chat';
import { About } from './pages/About';
import { DisclaimerPage, TermsPage, PrivacyPage } from './pages/legal/LegalPage';
import { NotFound } from './pages/NotFound';

/**
 * Route table for the app. Each page lives under src/pages/. As more pages are
 * ported from the legacy site they slot in here (see MIGRATION.md).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'library', element: <Library /> },
      { path: 'library/:slug', element: <Document /> },
      { path: 'chat', element: <Chat /> },
      { path: 'tools', element: <ToolsIndex /> },
      { path: 'tools/crosswind', element: <Crosswind /> },
      { path: 'tools/density-altitude', element: <DensityAltitude /> },
      { path: 'tools/tas', element: <Tas /> },
      { path: 'about', element: <About /> },
      { path: 'disclaimer', element: <DisclaimerPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
