import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import Composer from '../components/Composer';
import { Note, Visibility } from '../types';
import { noteApi } from '../api/notes';

export default function NoteEditPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const noteId = Number(id);
  const validId = Number.isInteger(noteId) && noteId > 0;

  useEffect(() => {
    if (!validId) {
      setNote(null);
      setLoading(false);
      return;
    }
    noteApi
      .get(noteId)
      .then(setNote)
      .catch(() => setNote(null))
      .finally(() => setLoading(false));
  }, [noteId, validId]);

  const handleSave = async (input: { content: string; visibility: Visibility }) => {
    if (!validId) return;
    await noteApi.update(noteId, input);
    navigate('/');
  };

  if (loading) return <Typography>加载中…</Typography>;
  if (!note) return <Typography color="error">笔记不存在</Typography>;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        编辑笔记
      </Typography>
      <Composer
        initial={{ content: note.content, visibility: note.visibility }}
        submitLabel="保存"
        onSubmit={handleSave}
        onCancel={() => navigate('/')}
      />
    </Box>
  );
}
