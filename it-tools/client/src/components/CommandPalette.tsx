import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fuzzyMatchTools } from '../utils/search';
import { tools } from '../tools/registry';

interface CommandPaletteProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * 全局命令面板：Ctrl/Cmd + K 唤起，对全部工具做模糊搜索并一键跳转。
 * 复用 utils/search 的 fuzzyMatchTools，不引入新依赖。
 */
export default function CommandPalette({ open, onOpen, onClose }: CommandPaletteProps): JSX.Element {
  const navigate = useNavigate();
  const [query, setQuery] = useState<string>('');
  const [active, setActive] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 全局快捷键：Ctrl/Cmd + K 切换面板。
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpen, onClose]);

  // 打开时重置查询并将焦点放到输入框。
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const matches = useMemo(
    () => (query.trim() ? fuzzyMatchTools(tools, query) : tools),
    [query],
  );

  const select = (index: number): void => {
    const tool = matches[index];
    if (!tool) return;
    navigate(`/tool/${tool.key}`);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ p: 1.5 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="搜索工具…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          ↑↓ 选择 · Enter 打开 · Esc 关闭
        </Typography>
        <List dense sx={{ maxHeight: 360, overflow: 'auto', mt: 0.5 }}>
          {matches.map((tool, i) => (
            <ListItemButton
              key={tool.key}
              selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => select(i)}
              sx={{
                borderRadius: 1.5,
                '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
              }}
            >
              <ListItemText
                primary={tool.title}
                secondary={tool.category}
                primaryTypographyProps={{ fontSize: 14 }}
                secondaryTypographyProps={{ fontSize: 12 }}
              />
            </ListItemButton>
          ))}
          {matches.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 1.5 }}>
              没有匹配「{query}」的工具。
            </Typography>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
