import { Outlet, Link } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

/**
 * Web API client clone shell: app bar plus a full-viewport workspace so the
 * request builder and response viewer can use the full height.
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <SendOutlinedIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: 'inherit', textDecoration: 'none' }}
          >
            API 客户端 · Hoppscotch 克隆
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
