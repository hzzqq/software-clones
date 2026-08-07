import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Composer from '../components/Composer';
import NoteCard from '../components/NoteCard';
import TagFilter from '../components/TagFilter';
import { Note, Visibility } from '../types';
import { noteApi } from '../api/notes';
import { tagApi } from '../api/tags';
import { useNotes } from '../hooks/useNotes';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { parseSearchQuery, describeQuery } from '../utils/searchQuery';
import { pinnedNotes, sortNotesByPinned, summarizeNotes, filterNotesByTag, filterNotesByVisibility, groupNotesByMonth, groupNotesByDay, dayLabel, formatCharCount, visibilityLabel, sortNotes } from '../utils/notes';

/** 分组视图模式：不分组 / 按天 / 按月。 */
type GroupMode = 'none' | 'day' | 'month';

/** 搜索语法速查，展示在搜索框旁的 Tooltip 里。 */
const SEARCH_SYNTAX_HINT = [
  '会议 纪要      多个关键词是「且」',
  '"季度 复盘"    引号内整体匹配',
  '-草稿          排除含该词的笔记',
  '#工作          按标签过滤',
  'is:pinned      仅置顶（unpinned / archived / active）',
  'vis:public     按可见性（public / protected / private）',
  'after:2026-01-01  before:2026-02-01',
  'on:2026-01-15  仅这一天',
].join('\n');

export default function NotesPage(): JSX.Element {
  const navigate = useNavigate();
  const [archived, setArchived] = useState(false);
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'updated'>('newest');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [visFilter, setVisFilter] = useState<'' | 'public' | 'protected' | 'private'>('');
  const [dropdownTag, setDropdownTag] = useState('');
  const [tags, setTags] = useState<{ id: number; name: string; count: number }[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  // 搜索防抖：边打字边请求会把后端打满，300ms 静默后再查。
  const debouncedQ = useDebouncedValue(q, 300);
  const { notes, loading, error, reload } = useNotes({ archived, tag: activeTag, q: debouncedQ });

  // 结构化查询解析：与服务端共用同一份实现，保证「回显的条件」= 「实际生效的条件」。
  const parsedQuery = useMemo(() => parseSearchQuery(debouncedQ), [debouncedQ]);
  const conditions = useMemo(() => describeQuery(parsedQuery), [parsedQuery]);
  const searching = q !== debouncedQ;

  const sorted = useMemo(() => sortNotes(notes, sort), [notes, sort]);

  const summary = useMemo(() => summarizeNotes(notes), [notes]);

  const visible = useMemo(
    () => sortNotesByPinned(onlyPinned ? pinnedNotes(sorted) : sorted),
    [onlyPinned, sorted]
  );

  const byVisibility = useMemo(
    () => filterNotesByVisibility(visible, visFilter),
    [visible, visFilter]
  );

  const filtered = useMemo(
    () => filterNotesByTag(byVisibility, dropdownTag),
    [byVisibility, dropdownTag]
  );

  const grouped = useMemo(() => {
    if (groupMode === 'month') return groupNotesByMonth(filtered);
    if (groupMode === 'day') return groupNotesByDay(filtered);
    return {} as Record<string, Note[]>;
  }, [groupMode, filtered]);
  const groupKeys = useMemo(() => Object.keys(grouped), [grouped]);
  const groupTitle = (key: string): string => (groupMode === 'day' ? dayLabel(key) : key);

  const refreshTags = () => tagApi.list().then(setTags).catch(() => undefined);
  useEffect(() => {
    refreshTags();
  }, []);

  const handleCreate = async (input: { content: string; visibility: Visibility }) => {
    await noteApi.create(input);
    await reload();
    await refreshTags();
  };
  const handleEdit = (note: Note) => navigate(`/notes/${note.id}/edit`);
  const handleArchive = async (note: Note) => {
    await noteApi.archive(note.id);
    await reload();
  };
  const handleUnarchive = async (note: Note) => {
    await noteApi.unarchive(note.id);
    await reload();
  };
  const handlePin = async (note: Note) => {
    await noteApi.pin(note.id);
    await reload();
  };
  const handleUnpin = async (note: Note) => {
    await noteApi.unpin(note.id);
    await reload();
  };
  const handleDelete = async (note: Note) => {
    setDeleteTarget(note);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await noteApi.remove(deleteTarget.id);
    setDeleteTarget(null);
    await reload();
    await refreshTags();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          轻笔记
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={archived ? 'arch' : 'active'}
          onChange={(_, v) => v && setArchived(v === 'arch')}
        >
          <ToggleButton value="active">活跃</ToggleButton>
          <ToggleButton value="arch">归档</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="搜索：关键词 #标签 is:pinned vis:public after:2026-01-01 -排除"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mt: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {q ? (
                <IconButton size="small" onClick={() => setQ('')} aria-label="清空搜索">
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null}
              <Tooltip
                title={
                  <Box component="pre" sx={{ m: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {SEARCH_SYNTAX_HINT}
                  </Box>
                }
              >
                <IconButton size="small" aria-label="搜索语法帮助">
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />

      {(conditions.length > 0 || parsedQuery.unknown.length > 0 || searching) && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }} alignItems="center">
          {searching && (
            <Typography variant="caption" color="text.secondary">
              输入中…
            </Typography>
          )}
          {conditions.map((c) => (
            <Chip key={c} size="small" variant="outlined" color="primary" label={c} />
          ))}
          {parsedQuery.unknown.map((u) => (
            <Tooltip key={u} title="无法识别的条件，已按普通关键词处理">
              <Chip size="small" variant="outlined" color="warning" label={`? ${u}`} />
            </Tooltip>
          ))}
          {conditions.length > 0 && (
            <Chip size="small" label="清空条件" onDelete={() => setQ('')} onClick={() => setQ('')} />
          )}
        </Stack>
      )}

      {!archived && <Composer onSubmit={handleCreate} />}

      <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
        <Typography variant="caption" color="text.secondary">
          共 {summary.total} 篇 · {formatCharCount(summary.totalChars)} 字 · {summary.tagTotal} 个标签
        </Typography>
        {visFilter && (
          <Chip
            size="small"
            color="secondary"
            label={`${visibilityLabel(visFilter)} ✕`}
            onDelete={() => setVisFilter('')}
          />
        )}
      </Stack>

      <Box sx={{ mt: 2 }}>
        <TagFilter tags={tags} active={activeTag} onSelect={setActiveTag} />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel control={<Switch size="small" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} />} label="仅看置顶" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>分组</InputLabel>
          <Select
            label="分组"
            value={groupMode}
            onChange={(e) => setGroupMode(e.target.value as GroupMode)}
          >
            <MenuItem value="none">不分组</MenuItem>
            <MenuItem value="day">按天</MenuItem>
            <MenuItem value="month">按月</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>按标签筛选</InputLabel>
          <Select
            label="按标签筛选"
            value={dropdownTag}
            onChange={(e) => setDropdownTag(e.target.value as string)}
          >
            <MenuItem value="">全部标签</MenuItem>
            {tags.map((t) => (
              <MenuItem key={t.id} value={t.name}>{`#${t.name} (${t.count})`}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>按可见性筛选</InputLabel>
          <Select
            label="按可见性筛选"
            value={visFilter}
            onChange={(e) => setVisFilter(e.target.value as '' | 'public' | 'protected' | 'private')}
          >
            <MenuItem value="">全部可见性</MenuItem>
            <MenuItem value="public">{visibilityLabel('public')}</MenuItem>
            <MenuItem value="protected">{visibilityLabel('protected')}</MenuItem>
            <MenuItem value="private">{visibilityLabel('private')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>排序</InputLabel>
          <Select
            label="排序"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'oldest' | 'updated')}
          >
            <MenuItem value="newest">最新创建</MenuItem>
            <MenuItem value="oldest">最早创建</MenuItem>
            <MenuItem value="updated">最近更新</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      {loading ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          加载中…
        </Typography>
      ) : notes.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {parsedQuery.isEmpty
            ? '还没有笔记，写下第一条吧。'
            : `没有符合条件的笔记（${conditions.join('、')}）。`}
        </Typography>
      ) : groupMode !== 'none' ? (
        <Stack spacing={3} sx={{ mt: 2 }}>
          {groupKeys.map((key) => (
            <Box key={key}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {groupTitle(key)}
                <Typography component="span" color="text.secondary" variant="caption" sx={{ ml: 1 }}>
                  （{grouped[key].length} 篇）
                </Typography>
              </Typography>
              <Stack spacing={2}>
                {grouped[key].map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onPin={handlePin}
                    onUnpin={handleUnpin}
                    onDelete={handleDelete}
                    onTagClick={setActiveTag}
                    highlightTerms={parsedQuery.terms}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {filtered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onDelete={handleDelete}
              onTagClick={setActiveTag}
              highlightTerms={parsedQuery.terms}
            />
          ))}
          {visible.length > 0 && filtered.length === 0 && (
            <Typography color="text.secondary">该标签下没有笔记。</Typography>
          )}
        </Stack>
      )}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>删除笔记</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定删除这条笔记吗？此操作不可撤销。
            {deleteTarget ? (
              <Box component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap', fontSize: 13, opacity: 0.8 }}>
                {deleteTarget.content.slice(0, 80)}
                {deleteTarget.content.length > 80 ? '…' : ''}
              </Box>
            ) : null}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
