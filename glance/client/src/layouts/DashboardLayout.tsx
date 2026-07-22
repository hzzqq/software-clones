import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout(): JSX.Element {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" color="default" sx={{ bgcolor: '#0b1220' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700}>
            Glance 仪表盘
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: { xs: 1, md: 2 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
