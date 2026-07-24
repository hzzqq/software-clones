import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
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
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Card, Tag, PRIORITY_LABELS } from '../types';
import { CardPatch } from '../api/cards';
import { formatRelativeTime } from '../utils/time';
import TagChip from './TagChip';

interface CardModalProps {
  card: Card | null;
  tags: Tag[];
  open: boolean;
  onClose: () => void;
  onSave: (id: number, patch: CardPatch) => void;
  onDelete: (id: number) => void;
  onToggleTag: (cardId: number, tagId: number) => void;
}

/** Modal editor for a single card (title / description / due / priority / tags). */
export default function CardModal({
  card,
  tags,
  open,
  onClose,
  onSave,
  onDelete,
  onToggleTag,
}: CardModalProps): JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<number>(0);
  const [completed, setCompleted] = useState<number>(0);
  const [due, setDue] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setPriority(card.priority);
      setCompleted(card.completed);
      setDue(card.dueDate ? dayjs(card.dueDate) : null);
    }
  }, [card]);

  const handleSave = (): void => {
    if (!card) return;
    const patch: CardPatch = {
      title: title.trim() || card.title,
      description,
      priority,
      completed,
      dueDate: due ? due.toISOString() : null,
    };
    onSave(card.id, patch);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>编辑卡片</DialogTitle>
      {card && (
        <Box sx={{ px: 3, pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(card.createdAt) ? `创建于 ${formatRelativeTime(card.createdAt)}` : '创建于 —'}
            {' · '}
            {formatRelativeTime(card.updatedAt) ? `更新于 ${formatRelativeTime(card.updatedAt)}` : '更新于 —'}
          </Typography>
        </Box>
      )}
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="标题"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="描述"
            fullWidth
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>优先级</InputLabel>
              <Select
                label="优先级"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={Number(k)}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DatePicker
              label="截止日期"
              value={due}
              onChange={(v) => setDue(v)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={!!completed}
                onChange={(e) => setCompleted(e.target.checked ? 1 : 0)}
              />
              <Typography>已完成</Typography>
            </Box>
          </Stack>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              标签
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {tags.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  暂无标签
                </Typography>
              )}
              {tags.map((t) => (
                <TagChip
                  key={t.id}
                  name={t.name}
                  color={t.color}
                  selected={card?.tagIds.includes(t.id) ?? false}
                  onClick={() => card && onToggleTag(card.id, t.id)}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={() => card && onDelete(card.id)}>
          删除
        </Button>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
