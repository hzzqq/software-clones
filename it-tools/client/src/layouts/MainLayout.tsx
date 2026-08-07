import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
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
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import ExtensionIcon from '@mui/icons-material/Extension';
import ClearIcon from '@mui/icons-material/Clear';
import { sortTools, fuzzyMatchTools, summarizeTools, toolCategoryLabel } from '../utils/search';
import { compactNumber } from '../utils/tools';
import { useSettingsHelp } from '../components/SettingsHelp';
import CommandPalette from '../components/CommandPalette';

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
  const [catFilter, setCatFilter] = useState<string>('');
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  // 设置已统一收敛到共享的「设置」面板（右下角悬浮入口 / Ctrl+, 亦可打开）。
  const { openSettings } = useSettingsHelp();

  const filteredGroups = useMemo(() => {
    const scoped = catFilter ? groups.filter((g) => g.category === catFilter) : groups;
    const base = query.trim()
      ? scoped
          .map((g) => ({ ...g, items: fuzzyMatchTools(g.items, query) }))
          .filter((g) => g.items.length > 0)
      : scoped;
    return base.map((g) => ({ ...g, items: sortTools(g.items, sortBy) }));
  }, [query, sortBy, catFilter]);

  const summary = summarizeTools(filteredGroups.flatMap((g) => g.items));

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
          InputProps={{
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="清除搜索" onClick={() => setQuery('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
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
        <FormControl size="small" fullWidth sx={{ mt: 1 }}>
          <InputLabel id="tool-cat-label">分类</InputLabel>
          <Select
            labelId="tool-cat-label"
            label="分类"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as string)}
          >
            <MenuItem value="">全部</MenuItem>
            {groups.map((g) => (
              <MenuItem key={g.category} value={g.category}>
                {g.category}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ px: 2, pb: 1 }}>
        <Chip size="small" variant="outlined" label={`匹配 ${compactNumber(summary.total)} 个工具 · ${summary.categories} 类`} />
      </Box>
      <Divider />
      <List dense>
        {filteredGroups.map((group) => (
          <Box key={group.category} sx={{ mb: 0.5 }}>
            <Typography
              variant="overline"
              sx={{ pl: 2, color: 'text.secondary', lineHeight: 2.2 }}
            >
              {toolCategoryLabel(group.category)}
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
          onClick={() => {
            setMobileOpen(false);
            openSettings();
          }}
          sx={{ borderRadius: 1.5, mx: 1 }}
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
          <IconButton color="inherit" onClick={openSettings} aria-label="settings">
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setPaletteOpen(true)} aria-label="command palette" title="命令面板 (Ctrl/Cmd + K)">
            <SearchIcon />
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

      <CommandPalette
        open={paletteOpen}
        onOpen={() => setPaletteOpen(true)}
        onClose={() => setPaletteOpen(false)}
      />
    </Box>
  );
}
