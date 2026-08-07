import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import RssFeedIcon from '@mui/icons-material/RssFeed';

/**
 * RSSReader clone shell: branded app bar with 文章/订阅源 tabs plus a centered
 * content container that renders the matched child route via `<Outlet />`.
 */
export default function MainLayout(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const tabValue = location.pathname.startsWith('/feeds') ? '/feeds' : '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <RssFeedIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            RSS 阅读器 · RSSReader 克隆
          </Typography>
          <Tabs
            value={tabValue}
            textColor="inherit"
            indicatorColor="secondary"
            onChange={(_e, value) => navigate(String(value))}
          >
            <Tab label="文章" value="/" />
            <Tab label="订阅源" value="/feeds" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
