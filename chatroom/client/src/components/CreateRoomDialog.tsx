import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

interface CreateRoomDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

/**
 * 创建房间弹窗。
 */
export default function CreateRoomDialog({
  open,
  onClose,
  onCreate,
}: CreateRoomDialogProps): JSX.Element {
  const [name, setName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const clean = name.trim().slice(0, 50);

  const handleCreate = async (): Promise<void> => {
    if (!clean) {
      setError('房间名称不能为空');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onCreate(clean);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>创建房间</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="房间名称"
          placeholder="例如 前端讨论组"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !submitting) {
              void handleCreate();
            }
          }}
          inputProps={{ maxLength: 50 }}
          error={Boolean(error)}
          helperText={error || '最多 50 个字符'}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button
          onClick={() => void handleCreate()}
          disabled={submitting || !clean}
          variant="contained"
        >
          {submitting ? '创建中…' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
