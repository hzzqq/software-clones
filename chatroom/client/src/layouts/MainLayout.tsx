import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import { Outlet, useNavigate } from 'react-router-dom';
import { SettingsHelpLauncher } from '../components/SettingsHelp';

/**
 * 应用主布局：顶部导航栏 + 内容区 + 右下角设置/帮助悬浮入口。
 */
export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <ForumIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            聊天室
          </Typography>
          <Button color="inherit" onClick={() => navigate('/rooms')}>
            房间列表
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
        <Outlet />
      </Box>
      <SettingsHelpLauncher />
    </Box>
  );
}
