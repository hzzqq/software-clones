import { Outlet, Link } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

/**
 * Markdown notes clone shell: app bar plus a full-viewport content area so the
 * split editor/preview can use the full height.
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <DescriptionOutlinedIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: 'inherit', textDecoration: 'none' }}
          >
            本地笔记 · Markdown 克隆
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
