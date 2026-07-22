import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { Outlet, useNavigate } from 'react-router-dom';

export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <ViewKanbanIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Kanban 看板
          </Typography>
          <Button color="inherit" onClick={() => navigate('/boards')}>
            看板列表
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
