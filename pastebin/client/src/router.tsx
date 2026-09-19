import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import Pastebin from './pages/Pastebin';

/**
 * Application route table for the Pastebin clone.
 * The index route renders the create/view paste UI.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Pastebin />,
      },
    ],
  },
]);
