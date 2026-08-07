import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import BookmarksPage from './pages/BookmarksPage';

/**
 * Bookmarks routes: single-page workspace under the main layout.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [{ index: true, element: <BookmarksPage /> }],
  },
]);
