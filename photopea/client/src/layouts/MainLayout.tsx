import { Outlet, Link } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';

/**
 * Photopea 克隆外壳：顶部品牌栏 + 占满剩余高度的内容区，
 * 通过 `<Outlet />` 渲染编辑器主页面（全屏画布 + 图层面板）。
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar variant="dense">
          <ImageIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            在线图像编辑器 · Photopea 克隆
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
