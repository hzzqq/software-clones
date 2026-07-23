import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
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
import { countChars, groupNotesByTag } from '../utils/notes';

export default function NotesPage(): JSX.Element {
  const navigate = useNavigate();
  const [archived, setArchived] = useState(false);
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'updated'>('newest');
  const [tags, setTags] = useState<{ id: number; name: string; count: number }[]>([]);
  const { notes, loading, error, reload } = useNotes({ archived, tag: activeTag, q });

  const sorted = useMemo(() => {
    const arr = [...notes];
    if (sort === 'newest') arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    else if (sort === 'oldest') arr.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    else arr.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return arr;
  }, [notes, sort]);

  const summary = useMemo(() => {
    const totalChars = notes.reduce((sum, n) => sum + countChars(n.content), 0);
    const tagCounts = groupNotesByTag(notes);
    return { total: notes.length, totalChars, tagTotal: Object.keys(tagCounts).length };
  }, [notes]);

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
        共 {summary.total} 篇 · {summary.totalChars} 字 · {summary.tagTotal} 个标签
      </Typography>

      <Box sx={{ mt: 2 }}>
        <TagFilter tags={tags} active={activeTag} onSelect={setActiveTag} />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
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
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {sorted.map((n) => (
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
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
