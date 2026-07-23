import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { noteApi } from '../api/notes';
import type { Note } from '../types';
import NoteList from '../components/NoteList';
import MarkdownPreview from '../components/MarkdownPreview';
import { parseTags, countWords, countCodeBlocks, estimateReadingTime, extractHeadings, sortNotes } from '../utils/markdown';

type ViewMode = 'edit' | 'split' | 'preview';

export default function NotesPage(): JSX.Element {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ViewMode>('split');
  const [saving, setSaving] = useState(false);
  const [outlineAnchor, setOutlineAnchor] = useState<null | HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headings = useMemo(() => (active ? extractHeadings(active.content) : []), [active]);
  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);

  const jumpToHeading = (id: string) => {
    setOutlineAnchor(null);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await noteApi.list({ q: query || undefined });
      setNotes(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectNote = async (id: number) => {
    try {
      const full = await noteApi.get(id);
      setActive(full);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const createNote = async () => {
    try {
      const created = await noteApi.create({ content: '# 新笔记\n\n开始写点什么…' });
      await loadList();
      setActive(created);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const persist = useCallback(
    async (patch: Partial<Note>) => {
      if (!active) return;
      setSaving(true);
      try {
        const updated = await noteApi.update(active.id, patch);
        setActive(updated);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === updated.id
              ? { ...n, title: updated.title, folder: updated.folder, tags: updated.tags, pinned: updated.pinned }
              : n,
          ),
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [active],
  );

  // 内容变更自动保存（防抖 800ms）
  useEffect(() => {
    if (!active || mode === 'preview') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({ content: active.content, title: active.title, folder: active.folder });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [active?.content, active?.title, active?.folder, mode, persist]);

  const togglePin = () => {
    if (active) void persist({ pinned: !active.pinned });
  };

  const removeNote = async () => {
    if (!active) return;
    try {
      await noteApi.remove(active.id);
      setActive(null);
      await loadList();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* 侧栏 */}
      <Box sx={{ width: 280, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" spacing={1} sx={{ p: 1 }} alignItems="center">
          <TextField
            size="small"
            placeholder="搜索…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Tooltip title="新建笔记">
            <IconButton onClick={createNote} color="primary">
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {loading ? (
              <CircularProgress sx={{ display: 'block', mx: 'auto', my: 3 }} />
            ) : (
              <NoteList notes={sortedNotes} activeId={active?.id ?? null} onSelect={selectNote} />
            )}
        </Box>
      </Box>

      {/* 编辑区 */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {!active ? (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 8 }}>
            <Typography>选择左侧笔记，或点击 + 新建一篇。</Typography>
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="标题"
                value={active.title}
                onChange={(e) => setActive({ ...active, title: e.target.value })}
                sx={{ flexGrow: 1 }}
              />
              <TextField
                size="small"
                label="文件夹"
                value={active.folder}
                onChange={(e) => setActive({ ...active, folder: e.target.value })}
                sx={{ width: 140 }}
              />
              <Tooltip title="置顶">
                <IconButton onClick={togglePin} color={active.pinned ? 'primary' : 'default'}>
                  <PushPinIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除">
                <IconButton onClick={removeNote} color="error">
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <ToggleButtonGroup
                size="small"
                value={mode}
                exclusive
                onChange={(_e, v) => v && setMode(v)}
              >
                <ToggleButton value="edit">编辑</ToggleButton>
                <ToggleButton value="split">分屏</ToggleButton>
                <ToggleButton value="preview">预览</ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="大纲">
                <span>
                  <IconButton
                    onClick={(e) => setOutlineAnchor(e.currentTarget)}
                    disabled={!active || headings.length === 0}
                  >
                    <ListAltIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Menu anchorEl={outlineAnchor} open={!!outlineAnchor} onClose={() => setOutlineAnchor(null)}>
                {headings.map((h) => (
                  <MenuItem
                    key={h.id}
                    onClick={() => jumpToHeading(h.id)}
                    sx={{ pl: 2 + (h.level - 1) * 2 }}
                  >
                    {h.text}
                  </MenuItem>
                ))}
              </Menu>
              <Stack direction="row" spacing={1} alignItems="center">
                {active.tags.map((t) => (
                  <Chip key={t} size="small" label={`#${t}`} />
                ))}
                <Typography variant="caption" color="text.secondary">
                  {countWords(active.content)} 词 · 约 {estimateReadingTime(active.content)} 分钟 ·{' '}
                  {countCodeBlocks(active.content)} 个代码块 {saving ? '· 保存中…' : ''}
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
              {(mode === 'edit' || mode === 'split') && (
                <TextField
                  multiline
                  fullWidth
                  value={active.content}
                  onChange={(e) => {
                    const content = e.target.value;
                    const tags = parseTags(content);
                    setActive({ ...active, content, tags });
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-root': { height: '100%', alignItems: 'stretch', fontFamily: 'monospace' },
                    '& textarea': { height: '100% !important' },
                  }}
                />
              )}
              {(mode === 'split' || mode === 'preview') && (
                <Box sx={{ flex: 1, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <MarkdownPreview content={active.content} />
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
