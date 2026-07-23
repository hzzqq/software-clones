import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import StarIcon from '@mui/icons-material/Star';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import ExtensionIcon from '@mui/icons-material/Extension';
import { filterTools, sortTools } from '../utils/search';

import { tools } from '../tools/registry';

const DRAWER_WIDTH = 264;

/**
 * Build a stable map of category → tool list, preserving first-seen order.
 */
function groupByCategory(): Array<{ category: string; items: typeof tools }> {
  const map = new Map<string, typeof tools>();
  for (const tool of tools) {
    const list = map.get(tool.category) ?? [];
    list.push(tool);
    map.set(tool.category, list);
  }
  return Array.from(map, ([category, items]) => ({ category, items }));
}

const groups = groupByCategory();

/**
 * Application shell for IT Tools: top app bar plus a category-grouped
 * navigation drawer, with the active tool rendered via `<Outlet />`.
 */
export default function MainLayout(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'key'>('title');
  const navigate = useNavigate();

  const filteredGroups = useMemo(() => {
    const base = query.trim()
      ? groups
          .map((g) => ({ ...g, items: filterTools(query, g.items) }))
          .filter((g) => g.items.length > 0)
      : groups;
    return base.map((g) => ({ ...g, items: sortTools(g.items, sortBy) }));
  }, [query, sortBy]);

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <Toolbar sx={{ px: 2 }}>
        <ExtensionIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" noWrap fontWeight={700}>
          IT Tools
        </Typography>
      </Toolbar>
      <Box sx={{ px: 2, py: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索工具…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
          <InputLabel id="tool-sort-label">排序</InputLabel>
          <Select
            labelId="tool-sort-label"
            label="排序"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'title' | 'key')}
          >
            <MenuItem value="title">按名称</MenuItem>
            <MenuItem value="key">按标识</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Divider />
      <List dense>
        {filteredGroups.map((group) => (
          <Box key={group.category} sx={{ mb: 0.5 }}>
            <Typography
              variant="overline"
              sx={{ pl: 2, color: 'text.secondary', lineHeight: 2.2 }}
            >
              {group.category}
            </Typography>
            {group.items.map((tool) => (
              <ListItemButton
                key={tool.key}
                component={NavLink}
                to={`/tool/${tool.key}`}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 1.5,
                  mx: 1,
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                }}
              >
                <ListItemText primary={tool.title} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            ))}
          </Box>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List dense>
        <ListItemButton
          component={NavLink}
          to="/favorites"
          onClick={() => setMobileOpen(false)}
          sx={{
            borderRadius: 1.5,
            mx: 1,
            '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <StarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="收藏夹" primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
        <ListItemButton
          component={NavLink}
          to="/settings"
          onClick={() => setMobileOpen(false)}
          sx={{
            borderRadius: 1.5,
            mx: 1,
            '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="设置" primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
        <ListItemButton
          component={NavLink}
          to="/history"
          onClick={() => setMobileOpen(false)}
          sx={{
            borderRadius: 1.5,
            mx: 1,
            '&.active': { bgcolor: 'primary.main', color: 'primary.contrastText' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="最近使用" primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="primary"
        elevation={1}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((o) => !o)}
            sx={{ mr: 1, display: { md: 'none' } }}
            aria-label="toggle navigation"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            IT Tools
          </Typography>
          <IconButton color="inherit" onClick={() => navigate('/favorites')} aria-label="favorites">
            <StarIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => navigate('/settings')} aria-label="settings">
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, bgcolor: 'background.default' }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
