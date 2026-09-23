import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import NoteIcon from '@mui/icons-material/Note';
import type { Note, NoteLabel, NoteView } from '../types';
import { NOTE_COLORS, NOTE_COLOR_OPTIONS } from '../types';
import { ApiError } from '../api/client';
import { notesApi } from '../api/notes';
import NoteCard from '../components/NoteCard';
import NoteEditorDialog from '../components/NoteEditorDialog';

/**
 * 极简便签主页：视图切换（活动/归档/回收站）、搜索、颜色/标签筛选、增删改查与置顶/归档。
 */
export default function NotesPage(): JSX.Element {
  const [view, setView] = useState<NoteView>('active');
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<NoteLabel[]>([]);
  const [search, setSearch] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [labelFilter, setLabelFilter] = useState<string>('');

  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const loadNotes = useCallback(async (): Promise<void> => {
    try {
      const data = await notesApi.list({
        view,
        color: colorFilter || undefined,
        label: labelFilter || undefined,
        q: search.trim() || undefined,
      });
      setNotes(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载便签失败');
    }
  }, [view, colorFilter, labelFilter, search]);

  const loadLabels = useCallback(async (): Promise<void> => {
    try {
      setLabels(await notesApi.labels());
    } catch {
      /* 忽略标签加载错误 */
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    void loadLabels();
  }, [loadLabels]);

  const handleTogglePin = async (note: Note): Promise<void> => {
    try {
      await notesApi.update(note.id, { ...toForm(note), isPinned: !note.isPinned });
      setNotice(note.isPinned ? '已取消置顶' : '已置顶');
      void loadNotes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败');
    }
  };

  const handleToggleArchive = async (note: Note): Promise<void> => {
    try {
      await notesApi.update(note.id, { ...toForm(note), isArchived: !note.isArchived });
      setNotice(note.isArchived ? '已取消归档' : '已归档');
      void loadNotes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败');
    }
  };

  const handleDelete = async (note: Note): Promise<void> => {
    const confirmed = window.confirm(
      view === 'trash' ? `彻底删除便签「${note.title || '无标题'}」？此操作不可恢复。` : `将便签「${note.title || '无标题'}」移入回收站？`,
    );
    if (!confirmed) return;
    try {
      await notesApi.remove(note.id);
      setNotice(view === 'trash' ? '已彻底删除' : '已移入回收站');
      void loadNotes();
      void loadLabels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  const handleRestore = async (note: Note): Promise<void> => {
    try {
      await notesApi.update(note.id, { ...toForm(note), isTrash: false, isArchived: false });
      setNotice('已恢复');
      void loadNotes();
      void loadLabels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '恢复失败');
    }
  };

  const handleSaved = (): void => {
    setNotice(editing ? '便签已更新' : '便签已保存');
    setEditing(null);
    void loadNotes();
    void loadLabels();
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          便签
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索标题 / 正文…"
          size="small"
          sx={{ maxWidth: 320 }}
          InputProps={{
            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} />,
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
        >
          新建便签
        </Button>
      </Stack>

      <Paper sx={{ px: 1, mb: 2 }} elevation={0}>
        <Tabs
          value={view}
          onChange={(_e, v: NoteView) => setView(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="active" label="活动" />
          <Tab value="archived" label="归档" />
          <Tab value="trash" label="回收站" />
        </Tabs>
      </Paper>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }} alignItems="center">
        <ToggleButtonGroup
          size="small"
          value={colorFilter}
          exclusive
          onChange={(_e, v: string | null) => setColorFilter(v ?? '')}
        >
          <ToggleButton value="">
            <Typography variant="caption">全部颜色</Typography>
          </ToggleButton>
          {NOTE_COLOR_OPTIONS.filter((c) => c !== 'default').map((c) => (
            <ToggleButton key={c} value={c} sx={{ px: 1 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '4px',
                  backgroundColor: NOTE_COLORS[c].bg,
                  border: `1px solid ${NOTE_COLORS[c].border}`,
                }}
              />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {labels.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {labels.map((label) => (
              <Chip
                key={label.id}
                label={`${label.name} (${label.count})`}
                size="small"
                color={labelFilter === label.name ? 'primary' : 'default'}
                onClick={() => setLabelFilter((prev) => (prev === label.name ? '' : label.name))}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {notes.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <NoteIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {view === 'trash' ? '回收站是空的' : view === 'archived' ? '还没有归档的便签' : '还没有便签'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            点击右上角「新建便签」记录灵感，或用颜色与标签整理。
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {notes.map((note) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={note.id}>
              <NoteCard
                note={note}
                showArchivedActions={view === 'archived'}
                showTrashActions={view === 'trash'}
                onEdit={(n) => {
                  setEditing(n);
                  setEditorOpen(true);
                }}
                onTogglePin={handleTogglePin}
                onToggleArchive={handleToggleArchive}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <NoteEditorDialog
        open={editorOpen}
        note={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <Snackbar
        open={notice.length > 0}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/** 把 Note 还原成表单值（用于置顶/归档/恢复等部分更新）。 */
function toForm(note: Note): import('../types').NoteFormValues {
  return {
    title: note.title,
    body: note.body,
    color: note.color,
    isPinned: note.isPinned,
    labels: note.labels.join(', '),
    items: note.items.map((it) => ({ text: it.text, done: it.done })),
  };
}
