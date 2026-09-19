import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Note, NoteFormValues } from '../types';
import { NOTE_COLOR_OPTIONS, NOTE_COLORS } from '../types';
import { ApiError } from '../api/client';
import { notesApi } from '../api/notes';

interface NoteEditorDialogProps {
  open: boolean;
  /** 传入则编辑，否则新建。 */
  note: Note | null;
  onClose: () => void;
  onSaved: (note: Note) => void;
}

const EMPTY: NoteFormValues = {
  title: '',
  body: '',
  color: 'default',
  isPinned: false,
  labels: '',
  items: [],
};

interface ItemDraft {
  text: string;
  done: boolean;
}

/**
 * 新建 / 编辑便签对话框：标题、正文、颜色、置顶、标签、勾选清单。
 */
export default function NoteEditorDialog({
  open,
  note,
  onClose,
  onSaved,
}: NoteEditorDialogProps): JSX.Element {
  const [values, setValues] = useState<NoteFormValues>(EMPTY);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setValues(
        note
          ? {
              title: note.title,
              body: note.body,
              color: note.color,
              isPinned: note.isPinned,
              labels: note.labels.join(', '),
              items: note.items.map((it) => ({ text: it.text, done: it.done })),
            }
          : EMPTY,
      );
      setError('');
      setSaving(false);
    }
  }, [open, note]);

  const handleSave = async (): Promise<void> => {
    if (!values.title.trim() && !values.body.trim() && values.items.every((i) => !i.text.trim())) {
      setError('请至少填写标题、正文或清单项');
      return;
    }
    setSaving(true);
    try {
      const saved = note ? await notesApi.update(note.id, values) : await notesApi.create(values);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{note ? '编辑便签' : '新建便签'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="标题"
            value={values.title}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, title: e.target.value }));
              setError('');
            }}
            fullWidth
            autoFocus
          />

          <TextField
            label="正文"
            value={values.body}
            onChange={(e) => setValues((prev) => ({ ...prev, body: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
            maxRows={10}
            disabled={values.items.length > 0}
            helperText={values.items.length > 0 ? '存在勾选清单时正文不可编辑' : undefined}
          />

          <FormControl fullWidth>
            <InputLabel id="note-color-label">颜色</InputLabel>
            <Select
              labelId="note-color-label"
              label="颜色"
              value={values.color}
              onChange={(e) => setValues((prev) => ({ ...prev, color: e.target.value }))}
            >
              {NOTE_COLOR_OPTIONS.map((c) => (
                <MenuItem key={c} value={c}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '4px',
                        backgroundColor: NOTE_COLORS[c].bg,
                        border: `1px solid ${NOTE_COLORS[c].border}`,
                      }}
                    />
                    {c}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="标签（逗号分隔，可选）"
            placeholder="灵感, 待办, 工作"
            value={values.labels}
            onChange={(e) => setValues((prev) => ({ ...prev, labels: e.target.value }))}
            fullWidth
          />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2">勾选清单（Checklist）</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                setValues((prev) => ({ ...prev, items: [...prev.items, { text: '', done: false }] }))
              }
            >
              添加项
            </Button>
          </Stack>

          {values.items.map((item, idx) => (
            <Stack key={idx} direction="row" spacing={1} alignItems="center">
              <input
                type="checkbox"
                checked={item.done}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    items: prev.items.map((it, i) =>
                      i === idx ? { ...it, done: e.target.checked } : it,
                    ),
                  }))
                }
              />
              <TextField
                value={item.text}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    items: prev.items.map((it, i) =>
                      i === idx ? { ...it, text: e.target.value } : it,
                    ),
                  }))
                }
                placeholder="清单项内容"
                size="small"
                fullWidth
              />
              <IconButton
                size="small"
                color="error"
                onClick={() =>
                  setValues((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
                }
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}

          <Stack direction="row" alignItems="center" spacing={1}>
            <input
              type="checkbox"
              id="note-pin"
              checked={values.isPinned}
              onChange={(e) => setValues((prev) => ({ ...prev, isPinned: e.target.checked }))}
            />
            <label htmlFor="note-pin">
              <Typography variant="body2">置顶此便签</Typography>
            </label>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
