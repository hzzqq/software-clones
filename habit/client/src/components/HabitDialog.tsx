import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Habit, HabitInput } from '../types';
import { FREQUENCY_OPTIONS, ICON_CHOICES, emptyHabitInput } from '../types';

export interface HabitDialogProps {
  open: boolean;
  /** 编辑模式传入原习惯；新建模式传 null。 */
  habit: Habit | null;
  onClose: () => void;
  onSubmit: (input: HabitInput) => Promise<void>;
}

export default function HabitDialog({ open, habit, onClose, onSubmit }: HabitDialogProps): JSX.Element {
  const [form, setForm] = useState<HabitInput>(emptyHabitInput());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      setForm(
        habit
          ? {
              name: habit.name,
              icon: habit.icon,
              frequencyType: habit.frequencyType,
              targetCount: habit.targetCount,
            }
          : emptyHabitInput()
      );
      setError('');
      setSubmitting(false);
    }
  }, [open, habit]);

  const nameError = useMemo(() => (form.name.trim() ? '' : '习惯名称必填'), [form.name]);

  const setField = <K extends keyof HabitInput>(key: K, value: HabitInput[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (!form.name.trim()) {
      setError('习惯名称不能为空');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ ...form, name: form.name.trim(), targetCount: Math.max(1, Math.floor(form.targetCount)) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const targetLabel =
    form.frequencyType === 'daily' ? `每天 ${form.targetCount} 次` : `每周 ${form.targetCount} 次`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{habit ? '编辑习惯' : '新建习惯'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="习惯名称 *"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            error={Boolean(nameError)}
            helperText={nameError || '例如：喝水、阅读、跑步'}
            fullWidth
            autoFocus
          />

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel>频率</InputLabel>
              <Select
                label="频率"
                value={form.frequencyType}
                onChange={(e) => setField('frequencyType', e.target.value as HabitInput['frequencyType'])}
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="目标次数"
              type="number"
              value={form.targetCount}
              onChange={(e) => setField('targetCount', Math.max(1, Number(e.target.value) || 1))}
              inputProps={{ min: 1, max: 99 }}
              sx={{ width: 140 }}
            />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              频率说明：{targetLabel}
              {form.frequencyType === 'daily' ? '（每天打卡一次）' : '（一周内累计打卡达到目标次数）'}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              图标（Emoji）
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {ICON_CHOICES.map((icon) => (
                <Chip
                  key={icon}
                  label={icon}
                  onClick={() => setField('icon', icon)}
                  variant={form.icon === icon ? 'filled' : 'outlined'}
                  color={form.icon === icon ? 'primary' : 'default'}
                  sx={{ fontSize: 20 }}
                />
              ))}
            </Stack>
            <TextField
              size="small"
              label="或自定义 Emoji"
              value={form.icon}
              onChange={(e) => setField('icon', e.target.value.slice(0, 8))}
              sx={{ mt: 1, width: 200 }}
            />
          </Box>

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
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
  );
}
