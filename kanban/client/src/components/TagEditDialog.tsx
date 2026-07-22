import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Box,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { Tag } from '../types';
import { tagsApi } from '../api/tags';

interface TagEditDialogProps {
  open: boolean;
  tags: Tag[];
  onClose: () => void;
  onSaved: () => void;
}

/** Edit existing tags' names and colors in place. */
export default function TagEditDialog({
  open,
  tags,
  onClose,
  onSaved,
}: TagEditDialogProps): JSX.Element {
  const [drafts, setDrafts] = useState<Record<number, { name: string; color: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const init: Record<number, { name: string; color: string }> = {};
      tags.forEach((t) => {
        init[t.id] = { name: t.name, color: t.color };
      });
      setDrafts(init);
      setError(null);
    }
  }, [open, tags]);

  const save = async (tag: Tag): Promise<void> => {
    const draft = drafts[tag.id];
    if (!draft || !draft.name.trim()) {
      setError('标签名不能为空');
      return;
    }
    setSavingId(tag.id);
    setError(null);
    try {
      await tagsApi.update(tag.id, { name: draft.name.trim(), color: draft.color });
      onSaved();
    } catch {
      setError('保存失败，请检查网络');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>编辑标签</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {tags.length === 0 && (
            <Box color="text.secondary" fontSize={14}>
              暂无标签，请先在卡片上创建。
            </Box>
          )}
          {tags.map((t) => (
            <Stack key={t.id} direction="row" spacing={1} alignItems="center">
              <input
                type="color"
                value={drafts[t.id]?.color ?? t.color}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], color: e.target.value } }))
                }
                aria-label={`${t.name} 颜色`}
                style={{ width: 36, height: 36, border: 'none', background: 'none' }}
              />
              <TextField
                size="small"
                fullWidth
                value={drafts[t.id]?.name ?? t.name}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], name: e.target.value } }))
                }
                label="标签名"
              />
              <IconButton
                onClick={() => void save(t)}
                disabled={savingId === t.id}
                aria-label="保存标签"
              >
                <SaveIcon />
              </IconButton>
            </Stack>
          ))}
          {error && <Box color="error.main" fontSize={13}>{error}</Box>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
