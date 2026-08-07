import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { VaultEntry, VaultEntryInput } from '../types';
import { CATEGORIES, emptyEntryInput } from '../types';
import { generatePassword, DEFAULT_PASSWORD_OPTIONS } from '../utils/passwordGenerator';
import PasswordGeneratorDialog from './PasswordGeneratorDialog';

export interface EntryDialogProps {
  open: boolean;
  /** 编辑模式传入原条目；新建模式传 null。 */
  entry: VaultEntry | null;
  onClose: () => void;
  onSubmit: (input: VaultEntryInput) => Promise<void>;
}

export default function EntryDialog({ open, entry, onClose, onSubmit }: EntryDialogProps): JSX.Element {
  const [form, setForm] = useState<VaultEntryInput>(emptyEntryInput());
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [generatorOpen, setGeneratorOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setForm(
        entry
          ? {
              title: entry.title,
              username: entry.username,
              password: entry.password,
              url: entry.url,
              notes: entry.notes,
              category: entry.category,
            }
          : emptyEntryInput()
      );
      setShowPassword(false);
      setError('');
      setSubmitting(false);
    }
  }, [open, entry]);

  const titleError = useMemo(() => (form.title.trim() ? '' : '标题必填'), [form.title]);

  const setField = <K extends keyof VaultEntryInput>(key: K, value: VaultEntryInput[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.title.trim()) {
      setError('标题不能为空');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ ...form, title: form.title.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const quickGenerate = (): void => {
    try {
      const pwd = generatePassword(DEFAULT_PASSWORD_OPTIONS);
      setField('password', pwd);
      setShowPassword(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{entry ? '编辑密码条目' : '新建密码条目'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="标题 *"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              error={Boolean(titleError)}
              helperText={titleError || '例如：GitHub 个人账号'}
              fullWidth
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="用户名 / 邮箱"
                value={form.username}
                onChange={(e) => setField('username', e.target.value)}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>分类</InputLabel>
                <Select
                  label="分类"
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="密码"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={showPassword ? '隐藏密码' : '显示密码'}>
                      <IconButton
                        edge="end"
                        aria-label="切换密码可见性"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="随机生成一个密码">
                      <IconButton edge="end" aria-label="随机生成密码" onClick={quickGenerate}>
                        <AutoAwesomeIcon />
                      </IconButton>
                    </Tooltip>
                    <Button size="small" onClick={() => setGeneratorOpen(true)} sx={{ ml: 0.5 }}>
                      生成器
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="网址"
              value={form.url}
              onChange={(e) => setField('url', e.target.value)}
              placeholder="https://…"
              fullWidth
            />
            <TextField
              label="备注"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            {error && (
              <Button color="error" size="small" onClick={() => setError('')} sx={{ textTransform: 'none' }}>
                {error}
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <PasswordGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onUse={(pwd) => {
          setField('password', pwd);
          setShowPassword(true);
          setGeneratorOpen(false);
        }}
      />
    </>
  );
}
