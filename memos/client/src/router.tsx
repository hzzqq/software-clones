import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import NotesPage from './pages/NotesPage';
import NoteEditPage from './pages/NoteEditPage';

/**
 * Memos routes: the stream lives at `/`; editing uses `/notes/:id/edit`.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <NotesPage /> },
      { path: 'notes/:id/edit', element: <NoteEditPage /> },
    ],
  },
]);
