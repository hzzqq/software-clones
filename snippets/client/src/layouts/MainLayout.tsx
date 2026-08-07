import { Link, Outlet } from 'react-router-dom';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';

/**
 * Snippets shell: branded app bar plus a centered content container that
 * renders the matched child route via `<Outlet />`.
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <CodeIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            代码片段 · Snippets
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            收藏常用代码，一键复制
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
