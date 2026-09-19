import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HelpDialog from '../components/HelpDialog';

/**
 * 主布局：顶部应用栏（导航 + 帮助）+ 内容容器（<Outlet />）。
 */
export default function MainLayout(): JSX.Element {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();

  const navItem = (to: string, label: string): JSX.Element => {
    const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Button
        component={NavLink}
        to={to}
        color="inherit"
        sx={{
          mx: 0.5,
          fontWeight: active ? 700 : 400,
          borderBottom: active ? '2px solid #fff' : '2px solid transparent',
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 3 }}>
            自托管相册
          </Typography>
          {navItem('/', '相册')}
          {navItem('/albums', '相册集')}
          <Box sx={{ flexGrow: 1 }} />
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
