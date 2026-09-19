import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HelpDialog from '../components/HelpDialog';

/**
 * 主布局：顶部应用栏（标题 + 帮助）+ 内容容器（<Outlet />）。
 */
export default function MainLayout(): JSX.Element {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            文件管理器
          </Typography>
          <Button color="inherit" startIcon={<HelpOutlineIcon />} onClick={() => setHelpOpen(true)}>
            帮助
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Box>
  );
}
