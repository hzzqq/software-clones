import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import Composer from '../components/Composer';
import NoteCard from '../components/NoteCard';
import TagFilter from '../components/TagFilter';
import { Note, Visibility } from '../types';
import { noteApi } from '../api/notes';
import { tagApi } from '../api/tags';
import { useNotes } from '../hooks/useNotes';

export default function NotesPage(): JSX.Element {
  const navigate = useNavigate();
  const [archived, setArchived] = useState(false);
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<{ id: number; name: string; count: number }[]>([]);
  const { notes, loading, error, reload } = useNotes({ archived, tag: activeTag });

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

      {!archived && <Composer onSubmit={handleCreate} />}

      <Box sx={{ mt: 2 }}>
        <TagFilter tags={tags} active={activeTag} onSelect={setActiveTag} />
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
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onDelete={handleDelete}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
