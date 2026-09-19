import { useState } from 'react';
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import type { Project } from '../types';
import { PROJECT_COLORS } from '../types';
import { ApiError } from '../api/client';
import { tasksApi } from '../api/tasks';

interface ProjectSidebarProps {
  projects: Project[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onChanged: () => void;
}

const COLOR_DOT: Record<string, string> = {
  default: '#9e9e9e',
  red: '#ef5350',
  orange: '#ff9800',
  yellow: '#fdd835',
  green: '#66bb6a',
  teal: '#26a69a',
  blue: '#42a5f5',
  purple: '#ab47bc',
  pink: '#ec407a',
};

/**
 * 项目（清单）侧栏：切换不同清单、新建清单、重命名 / 删除。
 */
export default function ProjectSidebar({
  projects,
  activeId,
  onSelect,
  onChanged,
}: ProjectSidebarProps): JSX.Element {
  const [adding, setAdding] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newColor, setNewColor] = useState<string>('blue');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);

  const createProject = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) return;
    try {
      const p = await tasksApi.createProject(name, newColor);
      setNewName('');
      setAdding(false);
      onChanged();
      onSelect(p.id);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '创建清单失败');
    }
  };

  const rename = async (): Promise<void> => {
    if (!menuProject) return;
    const name = window.prompt('重命名清单', menuProject.name);
    if (name && name.trim()) {
      try {
        await tasksApi.updateProject(menuProject.id, { name: name.trim() });
        onChanged();
      } catch (err) {
        window.alert(err instanceof ApiError ? err.message : '重命名失败');
      }
    }
    setMenuAnchor(null);
    setMenuProject(null);
  };

  const remove = async (): Promise<void> => {
    if (!menuProject) return;
    if (!window.confirm(`删除清单「${menuProject.name}」及其所有任务？`)) return;
    try {
      await tasksApi.removeProject(menuProject.id);
      onChanged();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : '删除失败');
    }
    setMenuAnchor(null);
    setMenuProject(null);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary">
          清单
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setAdding((v) => !v)}>
          新建
        </Button>
      </Stack>

      {adding ? (
        <Stack spacing={1} sx={{ mb: 1 }}>
          <TextField
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createProject();
            }}
            placeholder="清单名称"
            size="small"
            autoFocus
          />
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {PROJECT_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setNewColor(c)}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: COLOR_DOT[c],
                  cursor: 'pointer',
                  border: newColor === c ? '2px solid #333' : '2px solid transparent',
                }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={createProject}>
              创建
            </Button>
            <Button size="small" onClick={() => setAdding(false)}>
              取消
            </Button>
          </Stack>
        </Stack>
      ) : null}

      <List dense sx={{ p: 0 }}>
        {projects.map((p) => (
          <ListItemButton
            key={p.id}
            selected={p.id === activeId}
            onClick={() => onSelect(p.id)}
            sx={{ borderRadius: 1 }}
            secondaryAction={
              <IconButton
                size="small"
                onClick={(e) => {
                  setMenuAnchor(e.currentTarget);
                  setMenuProject(p);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <FolderIcon sx={{ color: COLOR_DOT[p.color] ?? COLOR_DOT.default }} />
            </ListItemIcon>
            <ListItemText primary={p.name} />
          </ListItemButton>
        ))}
      </List>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={rename}>重命名</MenuItem>
        <MenuItem onClick={remove} sx={{ color: 'error.main' }}>
          删除
        </MenuItem>
      </Menu>
    </Box>
  );
}
