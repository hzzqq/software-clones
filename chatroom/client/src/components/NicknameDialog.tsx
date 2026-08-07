import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { randomGuestName, sanitizeNickname } from '../utils/nickname';

interface NicknameDialogProps {
  open: boolean;
  initialValue: string;
  title?: string;
  submitLabel?: string;
  onSubmit: (nickname: string) => void;
}

/**
 * 昵称输入弹窗：进入房间前 / 修改昵称时使用。
 */
export default function NicknameDialog({
  open,
  initialValue,
  title = '设置你的昵称',
  submitLabel = '进入聊天',
  onSubmit,
}: NicknameDialogProps): JSX.Element {
  const [value, setValue] = useState<string>(initialValue || randomGuestName());

  useEffect(() => {
    if (open) {
      setValue(initialValue || randomGuestName());
    }
  }, [open, initialValue]);

  const valid = sanitizeNickname(value).length > 0;

  const handleSubmit = (): void => {
    const clean = sanitizeNickname(value);
    if (clean) {
      onSubmit(clean);
    }
  };

  return (
    <Dialog open={open} onClose={() => undefined} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="昵称"
          placeholder="例如 张三 / 游客1234"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) {
              handleSubmit();
            }
          }}
          inputProps={{ maxLength: 24 }}
          helperText="昵称将保存在当前浏览器，下次自动带出"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSubmit} disabled={!valid} variant="contained">
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
