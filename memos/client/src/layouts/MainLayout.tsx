import { useEffect } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Box, Container, IconButton, Toolbar, Typography } from '@mui/material';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { authStore } from '../authStore';
import { authApi } from '../api/auth';

/**
 * Memos clone shell: branded app bar plus a centered content container that
 * renders the matched child route via `<Outlet />`.未登录时强制跳转到 /login。
 */
export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const token = authStore.getToken();
  const user = authStore.getUser();

  useEffect(() => {
    const onUnauthorized = (): void => navigate('/login', { replace: true });
    window.addEventListener('memos:unauthorized', onUnauthorized);
    return () => window.removeEventListener('memos:unauthorized', onUnauthorized);
  }, [navigate]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      /* 忽略，本地清理即可 */
    }
    authStore.clear();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <NotesOutlinedIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            轻笔记 · Memos 克隆
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user.displayName}
            </Typography>
          )}
          <IconButton color="inherit" onClick={handleLogout} aria-label="退出登录">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
