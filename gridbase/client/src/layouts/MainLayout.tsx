import { Link, Outlet } from 'react-router-dom';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';
import TableChartIcon from '@mui/icons-material/TableChart';

/**
 * gridbase shell: branded app bar plus a content container that renders the
 * matched child route via `<Outlet />`.
 */
export default function MainLayout(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <TableChartIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            表格数据库 · GridBase
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            可配置字段类型的电子表格
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
