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
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LinkIcon from '@mui/icons-material/Link';
import { noteApi } from '../api/notes';
import type { Note } from '../types';
import NoteList from '../components/NoteList';
import MarkdownPreview from '../components/MarkdownPreview';
import { parseTags, countWords, countSentences, countParagraphs, countCodeBlocks, estimateReadingTime, extractHeadings, extractLinks, sortNotes, filterNotesByFolder, summarizeNotes, searchNotes } from '../utils/markdown';

type ViewMode = 'edit' | 'split' | 'preview';

export default function NotesPage(): JSX.Element {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ViewMode>('split');
  const [folderFilter, setFolderFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [outlineAnchor, setOutlineAnchor] = useState<null | HTMLElement>(null);
  const [linkAnchor, setLinkAnchor] = useState<null | HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headings = useMemo(() => (active ? extractHeadings(active.content) : []), [active]);
  const links = useMemo(() => (active ? extractLinks(active.content) : []), [active]);
  const sortedNotes = useMemo(() => sortNotes(notes), [notes]);
  const folderOptions = useMemo(() => {
    const set = new Set<string>();
    for (const n of sortedNotes) {
      const f = (n.folder ?? '').trim();
      if (f) set.add(f);
    }
    return Array.from(set).sort();
  }, [sortedNotes]);
  const visibleNotes = useMemo(
    () => {
      const byFolder = folderOptions.length ? filterNotesByFolder(sortedNotes, folderFilter) : sortedNotes;
      return searchNotes(byFolder, query);
    },
    [sortedNotes, folderOptions, folderFilter, query],
  );
  const summary = useMemo(() => summarizeNotes(visibleNotes), [visibleNotes]);

  const jumpToHeading = (id: string) => {
    setOutlineAnchor(null);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await noteApi.list();
      setNotes(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

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

  // 用 ref 持有最新 persist，避免其作为 effect 依赖导致死循环：
  // persist 依赖 [active]，每次保存后 setActive 会让其身份变化、effect 重跑、再次保存。
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // 内容变更自动保存（防抖 800ms）。仅依赖实际字段值，persist 走 ref，
  // 避免保存后 setActive 触发 persist 身份变化而不断重跑、造成无限回写。
  useEffect(() => {
    if (!active || mode === 'preview') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistRef.current({ content: active.content, title: active.title, folder: active.folder });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [active?.content, active?.title, active?.folder, mode]);

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
        {folderOptions.length > 0 && (
          <FormControl size="small" sx={{ px: 1, mb: 1 }}>
            <InputLabel id="folder-filter-label">文件夹</InputLabel>
            <Select
              labelId="folder-filter-label"
              label="文件夹"
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
            >
              <MenuItem value="all">全部文件夹</MenuItem>
              {folderOptions.map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Stack direction="row" spacing={1} sx={{ px: 1, pb: 1 }}>
          <Chip size="small" color="primary" variant="outlined" label={`共 ${summary.total} 篇 · ${summary.totalWords} 词 · ${summary.tagTotal} 标签`} />
        </Stack>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {loading ? (
              <CircularProgress sx={{ display: 'block', mx: 'auto', my: 3 }} />
            ) : (
              <NoteList notes={visibleNotes} activeId={active?.id ?? null} onSelect={selectNote} />
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
              <Tooltip title="链接">
                <span>
                  <IconButton
                    onClick={(e) => setLinkAnchor(e.currentTarget)}
                    disabled={!active || links.length === 0}
                  >
                    <LinkIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Menu anchorEl={linkAnchor} open={!!linkAnchor} onClose={() => setLinkAnchor(null)}>
                {links.map((l) => (
                  <MenuItem
                    key={l.url}
                    component="a"
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.text || l.url}
                  </MenuItem>
                ))}
              </Menu>
              <Stack direction="row" spacing={1} alignItems="center">
                {active.tags.map((t) => (
                  <Chip key={t} size="small" label={`#${t}`} />
                ))}
                <Typography variant="caption" color="text.secondary">
                  {countWords(active.content)} 词 · {countSentences(active.content)} 句 ·{' '}
                  {countParagraphs(active.content)} 段 · 约{' '}
                  {estimateReadingTime(active.content)} 分钟 · {countCodeBlocks(active.content)} 个代码块{' '}
                  {saving ? '· 保存中…' : ''}
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
