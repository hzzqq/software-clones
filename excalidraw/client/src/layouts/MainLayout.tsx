import { Outlet, Link } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import GestureIcon from '@mui/icons-material/Gesture';

/**
 * Excalidraw 克隆外壳：顶部品牌栏 + 占满剩余高度的内容区，
 * 通过 `<Outlet />` 渲染白板主页面（全屏画布）。
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar variant="dense">
          <GestureIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            手绘白板 · Excalidraw 克隆
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
