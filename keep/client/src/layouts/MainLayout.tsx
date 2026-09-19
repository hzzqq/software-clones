import { Link, Outlet } from 'react-router-dom';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import NoteIcon from '@mui/icons-material/Note';

/**
 * 极简便签外壳：品牌顶栏 + 内容容器，通过 `<Outlet />` 渲染子路由。
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <NoteIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            便签 · Keep
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            用颜色和标签捕捉零碎灵感
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
