import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './app/Layout';
import { Home } from './pages/Home/Home';
import { ToolsIndex } from './pages/tools/ToolsIndex';
import { Crosswind } from './pages/tools/Crosswind';
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
      { path: 'tools', element: <ToolsIndex /> },
      { path: 'tools/crosswind', element: <Crosswind /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
