import { Outlet } from 'react-router-dom';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

/**
 * Shlink clone shell: branded app bar plus a centered content container that
 * renders the matched child route via `<Outlet />`.
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <LinkIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component="a"
            href="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            短链接 · Shlink 克隆
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
