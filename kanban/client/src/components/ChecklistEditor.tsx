import { useState } from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ChecklistItem } from '../types';
import { checklistProgress } from '../utils/checklist';

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onAdd: (text: string) => void;
  onToggle: (itemId: number, done: number) => void;
  onRemove: (itemId: number) => void;
}

/** 卡片子任务清单编辑器：勾选 / 新增 / 删除 + 进度条。 */
export default function ChecklistEditor({
  items,
  onAdd,
  onToggle,
  onRemove,
}: ChecklistEditorProps): JSX.Element {
  const [draft, setDraft] = useState<string>('');
  const progress = checklistProgress(items);

  const submit = (): void => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="subtitle2">检查清单</Typography>
        <Typography variant="caption" color="text.secondary">
          {progress.total === 0 ? '暂无子任务' : `${progress.done}/${progress.total} · ${progress.percent}%`}
        </Typography>
      </Box>
      {progress.total > 0 && (
        <LinearProgress
          variant="determinate"
          value={progress.percent}
          color={progress.percent === 100 ? 'success' : 'primary'}
          sx={{ height: 6, borderRadius: 3, mb: 1 }}
        />
      )}
      <Stack spacing={0}>
        {items.map((it) => (
          <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Checkbox
              size="small"
              checked={it.done === 1}
              onChange={() => onToggle(it.id, it.done === 1 ? 0 : 1)}
            />
            <Typography
              variant="body2"
              sx={{
                flexGrow: 1,
                textDecoration: it.done === 1 ? 'line-through' : 'none',
                color: it.done === 1 ? 'text.disabled' : 'inherit',
                wordBreak: 'break-word',
              }}
            >
              {it.text}
            </Typography>
            <Tooltip title="删除子任务">
              <IconButton size="small" onClick={() => onRemove(it.id)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="添加子任务后回车"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Tooltip title="添加子任务">
          <span>
            <IconButton size="small" onClick={submit} disabled={!draft.trim()}>
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
