import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import NotesPage from './pages/NotesPage';
import NoteEditPage from './pages/NoteEditPage';
import AuthPage from './pages/AuthPage';

/**
 * Memos routes:
 *  - `/login` 为公开登录/注册页（不套用需鉴权的主布局）
 *  - 主页 `/` 与编辑页套用 MainLayout，内部强制登录态
 */
export const router = createBrowserRouter([
  { path: '/login', element: <AuthPage /> },
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
