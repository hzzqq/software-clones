import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
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
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import Composer from '../components/Composer';
import NoteCard from '../components/NoteCard';
import TagFilter from '../components/TagFilter';
import { Note, Visibility } from '../types';
import { noteApi } from '../api/notes';
import { tagApi } from '../api/tags';
import { useNotes } from '../hooks/useNotes';
import { pinnedNotes, sortNotesByPinned, summarizeNotes, filterNotesByTag, groupNotesByMonth, formatCharCount, sortNotes } from '../utils/notes';

export default function NotesPage(): JSX.Element {
  const navigate = useNavigate();
  const [archived, setArchived] = useState(false);
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'updated'>('newest');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [dropdownTag, setDropdownTag] = useState('');
  const [tags, setTags] = useState<{ id: number; name: string; count: number }[]>([]);
  const { notes, loading, error, reload } = useNotes({ archived, tag: activeTag, q });

  const sorted = useMemo(() => sortNotes(notes, sort), [notes, sort]);

  const summary = useMemo(() => summarizeNotes(notes), [notes]);

  const visible = useMemo(
    () => sortNotesByPinned(onlyPinned ? pinnedNotes(sorted) : sorted),
    [onlyPinned, sorted]
  );

  const filtered = useMemo(
    () => filterNotesByTag(visible, dropdownTag),
    [visible, dropdownTag]
  );

  const groupedByMonth = useMemo(
    () => (groupByMonth ? groupNotesByMonth(filtered) : {}),
    [groupByMonth, filtered]
  );
  const monthKeys = useMemo(() => Object.keys(groupedByMonth), [groupedByMonth]);

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
    if (!window.confirm('确定删除这条笔记？')) return;
    await noteApi.remove(note.id);
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
        placeholder="搜索笔记内容…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mt: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: q ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setQ('')} aria-label="清空搜索">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {!archived && <Composer onSubmit={handleCreate} />}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        共 {summary.total} 篇 · {formatCharCount(summary.totalChars)} 字 · {summary.tagTotal} 个标签
      </Typography>

      <Box sx={{ mt: 2 }}>
        <TagFilter tags={tags} active={activeTag} onSelect={setActiveTag} />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControlLabel control={<Switch size="small" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} />} label="仅看置顶" />
        <FormControlLabel control={<Switch size="small" checked={groupByMonth} onChange={(e) => setGroupByMonth(e.target.checked)} />} label="按月份分组" />
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
          还没有笔记，写下第一条吧。
        </Typography>
      ) : groupByMonth ? (
        <Stack spacing={3} sx={{ mt: 2 }}>
          {monthKeys.map((month) => (
            <Box key={month}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {month}
                <Typography component="span" color="text.secondary" variant="caption" sx={{ ml: 1 }}>
                  （{groupedByMonth[month].length} 篇）
                </Typography>
              </Typography>
              <Stack spacing={2}>
                {groupedByMonth[month].map((n) => (
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
                    highlight={q}
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
              highlight={q}
            />
          ))}
          {visible.length > 0 && filtered.length === 0 && (
            <Typography color="text.secondary">该标签下没有笔记。</Typography>
          )}
        </Stack>
      )}
    </Box>
  );
}
