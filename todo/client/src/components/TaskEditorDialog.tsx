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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import type { Task } from '../types';
import { PRIORITIES } from '../types';
import { ApiError } from '../api/client';
import { tasksApi } from '../api/tasks';

interface TaskEditorDialogProps {
  open: boolean;
  /** 传入则编辑，否则基于 projectId 新建。 */
  task: Task | null;
  projectId: number;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * 新建 / 编辑任务对话框：标题、描述、优先级 P1–P4、截止日期。
 */
export default function TaskEditorDialog({
  open,
  task,
  projectId,
  onClose,
  onSaved,
}: TaskEditorDialogProps): JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<number>(4);
  const [dueDate, setDueDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setPriority(task?.priority ?? 4);
      setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '');
      setError('');
      setSaving(false);
    }
  }, [open, task]);

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) {
      setError('标题不能为空');
      return;
    }
    setSaving(true);
    try {
      const values = {
        title: title.trim(),
        description,
        priority,
        dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
      };
      if (task) {
        await tasksApi.updateTask(task.id, values);
      } else {
        await tasksApi.createTask(projectId, values);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{task ? '编辑任务' : '新建任务'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="标题"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            fullWidth
            autoFocus
          />
          <TextField
            label="描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="task-priority-label">优先级</InputLabel>
              <Select
                labelId="task-priority-label"
                label="优先级"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              >
                {PRIORITIES.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label} {p.value === 1 ? '（最高）' : p.value === 4 ? '（最低）' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="截止日期（可选）"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
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
