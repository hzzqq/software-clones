import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import IosShareIcon from '@mui/icons-material/IosShare';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { noteApi } from '../api/notes';
import type { Note } from '../types';
import NoteList from '../components/NoteList';
import MarkdownPreview, { renderMarkdownHtml } from '../components/MarkdownPreview';
import EditorToolbar from '../components/EditorToolbar';
import FindReplaceBar from '../components/FindReplaceBar';
import OutlinePanel from '../components/OutlinePanel';
import StatusBar from '../components/StatusBar';
import type { SaveState } from '../components/StatusBar';
import type { OutlineItem } from '../utils/markdown';
import {
  parseTags,
  countWords,
  countSentences,
  countParagraphs,
  countCodeBlocks,
  estimateReadingTime,
  extractOutline,
  extractLinks,
  sortNotes,
  filterNotesByFolder,
  filterNotesByTag,
  summarizeNotes,
  searchNotes,
} from '../utils/markdown';
import type { MdActionId } from '../utils/mdEdit';
import { applyMdAction, matchShortcut, offsetOfLine, lineEndOf, countLines } from '../utils/mdEdit';
import { findMatches, nextMatchIndex, replaceMatch, replaceAll } from '../utils/mdFind';
import { buildExportHtml, downloadTextFile, printHtmlDocument, safeFileName } from '../utils/mdExport';

type ViewMode = 'edit' | 'split' | 'preview';

/** 待应用的选区（focus=true 时同时把焦点抢回编辑区）。 */
interface PendingSelection {
  start: number;
  end: number;
  focus: boolean;
}

/** 用于判断「是否有未保存改动」的内容快照。 */
function snapshotOf(note: Note): string {
  return JSON.stringify([note.content, note.title, note.folder]);
}

/**
 * 把指定字符下标所在行滚动到 textarea 视野中央。
 * 通过计算行号 × 行高实现，无需额外依赖；取不到行高时按字号 1.5 倍兜底。
 */
function scrollOffsetIntoView(el: HTMLTextAreaElement, offset: number): void {
  const line = el.value.slice(0, Math.max(0, offset)).split('\n').length - 1;
  let lineHeight = 20;
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(el);
    const parsed = Number.parseFloat(style.lineHeight);
    if (Number.isFinite(parsed) && parsed > 0) {
      lineHeight = parsed;
    } else {
      const fontSize = Number.parseFloat(style.fontSize);
      if (Number.isFinite(fontSize) && fontSize > 0) lineHeight = fontSize * 1.5;
    }
  }
  const target = line * lineHeight - el.clientHeight / 2;
  el.scrollTop = Math.max(0, target);
}

export default function NotesPage(): JSX.Element {
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ViewMode>('split');
  const [folderFilter, setFolderFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [linkAnchor, setLinkAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [cursorLine, setCursorLine] = useState(0);

  // —— 查找 / 替换状态（cycle 263）——
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchIndex, setMatchIndex] = useState(-1);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingSelection = useRef<PendingSelection | null>(null);
  const savedSnapshot = useRef<string>('');

  const content = active?.content ?? '';
  const outline = useMemo(() => extractOutline(content), [content]);
  const links = useMemo(() => extractLinks(content), [content]);
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
      const byTag = filterNotesByTag(byFolder, tagFilter);
      return searchNotes(byTag, query);
    },
    [sortedNotes, folderOptions, folderFilter, tagFilter, query],
  );
  const summary = useMemo(() => summarizeNotes(visibleNotes), [visibleNotes]);

  const matches = useMemo(
    () => (findOpen ? findMatches(content, findQuery, { caseSensitive, wholeWord }) : []),
    [findOpen, content, findQuery, caseSensitive, wholeWord],
  );

  /** 当前光标所在位置对应的大纲条目序号（用于高亮）。 */
  const activeOutlineIndex = useMemo(() => {
    let idx = -1;
    for (const item of outline) {
      if (item.line <= cursorLine) idx = item.index;
      else break;
    }
    return idx;
  }, [outline, cursorLine]);

  const dirty = active ? snapshotOf(active) !== savedSnapshot.current : false;
  const saveState: SaveState = saving ? 'saving' : dirty ? 'dirty' : 'saved';
  const editorVisible = mode === 'edit' || mode === 'split';

  /** 立即把选区应用到 textarea（内容未变化时使用，避免多余渲染）。 */
  const applySelectionNow = useCallback((start: number, end: number, focus: boolean): void => {
    const el = textareaRef.current;
    if (!el) return;
    if (focus) el.focus();
    el.setSelectionRange(start, end);
    scrollOffsetIntoView(el, start);
  }, []);

  // 内容被程序改写后（工具栏 / 快捷键 / 替换），在提交到 DOM 之后立刻回位光标。
  useLayoutEffect(() => {
    const el = textareaRef.current;
    const pending = pendingSelection.current;
    if (!el || !pending) return;
    pendingSelection.current = null;
    if (pending.focus) el.focus();
    el.setSelectionRange(pending.start, pending.end);
    scrollOffsetIntoView(el, pending.start);
  });

  // 轻提示自动消失，避免堆积遮挡内容。
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

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
      savedSnapshot.current = snapshotOf(full);
      setActive(full);
      setMatchIndex(-1);
      setCursorLine(0);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const createNote = async () => {
    try {
      const created = await noteApi.create({ content: '# 新笔记\n\n开始写点什么…' });
      await loadList();
      savedSnapshot.current = snapshotOf(created);
      setActive(created);
      setMatchIndex(-1);
      setCursorLine(0);
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
        savedSnapshot.current = snapshotOf(updated);
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

  /** 统一的正文写入口：同步刷新标签，供输入、工具栏、替换共用。 */
  const updateContent = useCallback((next: string) => {
    setActive((prev) => (prev ? { ...prev, content: next, tags: parseTags(next) } : prev));
  }, []);

  /** 执行一次编辑动作：读取当前选区 → 纯函数变换 → 写回并回位光标。 */
  const runAction = useCallback(
    (id: MdActionId) => {
      const el = textareaRef.current;
      if (!active || !el) return;
      const result = applyMdAction(active.content, { start: el.selectionStart, end: el.selectionEnd }, id);
      pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd, focus: true };
      updateContent(result.text);
    },
    [active, updateContent],
  );

  /** 跳到上一个 / 下一个命中，并把它选中（不抢焦点，保证可以连续按 Enter）。 */
  const gotoMatch = useCallback(
    (forward: boolean) => {
      if (matches.length === 0) return;
      const el = textareaRef.current;
      const cursor = el ? (forward ? el.selectionEnd : el.selectionStart) : 0;
      const idx = nextMatchIndex(matches, cursor, forward);
      if (idx < 0) return;
      setMatchIndex(idx);
      applySelectionNow(matches[idx].start, matches[idx].end, false);
    },
    [matches, applySelectionNow],
  );

  const handleReplaceOne = useCallback(() => {
    if (!active || matches.length === 0) return;
    const idx = matchIndex >= 0 && matchIndex < matches.length ? matchIndex : 0;
    const { text, cursor } = replaceMatch(active.content, matches[idx], replacement);
    // 替换后命中列表会重算，把光标停在替换结果之后，「下一个」自然继续向后。
    pendingSelection.current = { start: cursor, end: cursor, focus: false };
    setMatchIndex(-1);
    updateContent(text);
  }, [active, matches, matchIndex, replacement, updateContent]);

  const handleReplaceAll = useCallback(() => {
    if (!active) return;
    const { text, count } = replaceAll(active.content, findQuery, replacement, { caseSensitive, wholeWord });
    if (count === 0) {
      setNotice('没有可替换的内容');
      return;
    }
    setMatchIndex(-1);
    updateContent(text);
    setNotice(`已替换 ${count} 处`);
  }, [active, findQuery, replacement, caseSensitive, wholeWord, updateContent]);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setMatchIndex(-1);
    textareaRef.current?.focus();
  }, []);

  /**
   * 编辑区键盘入口。
   * - Ctrl/Cmd + F 打开查找替换，Ctrl/Cmd + S 立即保存（无论焦点在哪个子控件）；
   * - 其余 Markdown 快捷键仅在焦点位于正文 textarea 时生效，避免在查找框里误改正文。
   */
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!active) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (ctrl && !e.altKey && !e.shiftKey && key === 'f') {
      e.preventDefault();
      setFindOpen(true);
      return;
    }
    if (ctrl && !e.altKey && !e.shiftKey && key === 's') {
      e.preventDefault();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persist({ content: active.content, title: active.title, folder: active.folder });
      return;
    }
    if (e.target !== textareaRef.current) return;
    const action = matchShortcut(e);
    if (!action) return;
    e.preventDefault();
    runAction(action);
  };

  /** 光标移动时刷新所在行号，驱动大纲高亮。 */
  const handleCursorChange = (): void => {
    const el = textareaRef.current;
    if (!el) return;
    const line = el.value.slice(0, el.selectionStart).split('\n').length - 1;
    setCursorLine((prev) => (prev === line ? prev : line));
  };

  /** 点击大纲：编辑区定位到标题行并选中，预览区滚动到对应锚点。 */
  const jumpToOutline = (item: OutlineItem): void => {
    if (mode !== 'edit') {
      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCursorLine(item.line);
    if (!active || !editorVisible) return;
    const start = offsetOfLine(active.content, item.line);
    applySelectionNow(start, lineEndOf(active.content, start), true);
  };

  /** 组装可独立打开 / 打印的完整 HTML 文档（正文复用预览的净化渲染）。 */
  const buildHtmlDocument = (note: Note): string => {
    const meta = `导出自 Markdown 编辑器 · ${new Date().toLocaleString('zh-CN')} · ${countWords(note.content)} 词`;
    return buildExportHtml(note.title, renderMarkdownHtml(note.content), meta);
  };

  const exportMarkdown = (): void => {
    if (!active) return;
    setExportAnchor(null);
    const ok = downloadTextFile(safeFileName(active.title, 'md'), active.content, 'text/markdown');
    setNotice(ok ? '已导出 Markdown 文件' : '当前环境不支持下载');
  };

  const exportHtml = (): void => {
    if (!active) return;
    setExportAnchor(null);
    const ok = downloadTextFile(safeFileName(active.title, 'html'), buildHtmlDocument(active), 'text/html');
    setNotice(ok ? '已导出 HTML 文件' : '当前环境不支持下载');
  };

  const printNote = (): void => {
    if (!active) return;
    setExportAnchor(null);
    const ok = printHtmlDocument(buildHtmlDocument(active));
    if (!ok) setError('当前环境不支持打印');
  };

  const copyMarkdown = async (): Promise<void> => {
    if (!active) return;
    setExportAnchor(null);
    try {
      if (!navigator.clipboard?.writeText) {
        setError('当前浏览器不支持剪贴板写入，请手动全选复制');
        return;
      }
      await navigator.clipboard.writeText(active.content);
      setNotice('正文已复制到剪贴板');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const togglePin = () => {
    if (active) void persist({ pinned: !active.pinned });
  };

  const removeNote = async () => {
    if (!active) return;
    try {
      await noteApi.remove(active.id);
      savedSnapshot.current = '';
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
        <Stack direction="row" spacing={1} sx={{ px: 1, pb: 1 }} alignItems="center">
          <Chip size="small" color="primary" variant="outlined" label={`共 ${summary.total} 篇 · ${summary.totalWords} 词 · ${summary.tagTotal} 标签`} />
          {tagFilter && (
            <Chip
              size="small"
              color="secondary"
              label={`#${tagFilter} ✕`}
              onDelete={() => setTagFilter('')}
            />
          )}
        </Stack>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {loading ? (
              <CircularProgress sx={{ display: 'block', mx: 'auto', my: 3 }} />
            ) : (
              <NoteList notes={visibleNotes} activeId={active?.id ?? null} onSelect={selectNote} onTagClick={setTagFilter} />
            )}
        </Box>
      </Box>

      {/* 编辑区 */}
      <Box
        onKeyDown={handleEditorKeyDown}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2, overflow: 'hidden' }}
      >
        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}
        {notice && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setNotice(null)}>{notice}</Alert>}
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

            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
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
              <Tooltip title={outlineOpen ? '隐藏大纲' : '显示大纲'}>
                <IconButton
                  onClick={() => setOutlineOpen((v) => !v)}
                  color={outlineOpen ? 'primary' : 'default'}
                  aria-label="切换大纲侧栏"
                >
                  <ListAltIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="查找替换（Ctrl+F）">
                <span>
                  <IconButton
                    onClick={() => setFindOpen(true)}
                    disabled={!editorVisible}
                    color={findOpen ? 'primary' : 'default'}
                    aria-label="查找替换"
                  >
                    <SearchIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="链接">
                <span>
                  <IconButton
                    onClick={(e) => setLinkAnchor(e.currentTarget)}
                    disabled={links.length === 0}
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
              <Tooltip title="导出与打印">
                <IconButton onClick={(e) => setExportAnchor(e.currentTarget)} aria-label="导出与打印">
                  <IosShareIcon />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={() => setExportAnchor(null)}>
                <MenuItem onClick={exportMarkdown}>
                  <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>导出 Markdown（.md）</ListItemText>
                </MenuItem>
                <MenuItem onClick={exportHtml}>
                  <ListItemIcon><CodeOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>导出 HTML（.html）</ListItemText>
                </MenuItem>
                <MenuItem onClick={printNote}>
                  <ListItemIcon><PrintOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>打印 / 另存为 PDF</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => void copyMarkdown()}>
                  <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>复制正文到剪贴板</ListItemText>
                </MenuItem>
              </Menu>
              <Box sx={{ flexGrow: 1 }} />
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ overflow: 'hidden' }}>
                {active.tags.slice(0, 6).map((t) => (
                  <Chip key={t} size="small" label={`#${t}`} />
                ))}
              </Stack>
            </Stack>

            <Box sx={{ mb: 1 }}>
              <EditorToolbar onAction={runAction} disabled={!editorVisible} />
            </Box>

            {findOpen && editorVisible && (
              <FindReplaceBar
                query={findQuery}
                replacement={replacement}
                caseSensitive={caseSensitive}
                wholeWord={wholeWord}
                matchIndex={matchIndex}
                matchTotal={matches.length}
                onQuery={(v) => {
                  setFindQuery(v);
                  setMatchIndex(-1);
                }}
                onReplacement={setReplacement}
                onCaseSensitive={(v) => {
                  setCaseSensitive(v);
                  setMatchIndex(-1);
                }}
                onWholeWord={(v) => {
                  setWholeWord(v);
                  setMatchIndex(-1);
                }}
                onNext={() => gotoMatch(true)}
                onPrev={() => gotoMatch(false)}
                onReplaceOne={handleReplaceOne}
                onReplaceAll={handleReplaceAll}
                onClose={closeFind}
              />
            )}

            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
              {outlineOpen && (
                <OutlinePanel items={outline} activeIndex={activeOutlineIndex} onJump={jumpToOutline} />
              )}
              {editorVisible && (
                <TextField
                  multiline
                  fullWidth
                  value={active.content}
                  inputRef={textareaRef}
                  onSelect={handleCursorChange}
                  onClick={handleCursorChange}
                  onKeyUp={handleCursorChange}
                  onChange={(e) => {
                    updateContent(e.target.value);
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-root': { height: '100%', alignItems: 'stretch', fontFamily: 'monospace' },
                    '& textarea': { height: '100% !important', overflowY: 'auto !important' },
                  }}
                />
              )}
              {(mode === 'split' || mode === 'preview') && (
                <Box sx={{ flex: 1, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <MarkdownPreview content={active.content} />
                </Box>
              )}
            </Box>

            <StatusBar
              words={countWords(active.content)}
              characters={active.content.length}
              lines={countLines(active.content)}
              sentences={countSentences(active.content)}
              paragraphs={countParagraphs(active.content)}
              codeBlocks={countCodeBlocks(active.content)}
              headings={outline.length}
              readingMinutes={estimateReadingTime(active.content)}
              saveState={saveState}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
