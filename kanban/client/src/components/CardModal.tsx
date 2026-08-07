import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Activity, Card, Tag, PRIORITY_LABELS } from '../types';
import { CardPatch } from '../api/cards';
import { formatRelativeTime } from '../utils/time';
import { formatDueLabel } from '../utils/filterCards';
import TagChip from './TagChip';
import Markdown from './Markdown';
import ChecklistEditor from './ChecklistEditor';
import ActivityTimeline from './ActivityTimeline';

interface CardModalProps {
  card: Card | null;
  tags: Tag[];
  open: boolean;
  onClose: () => void;
  onSave: (id: number, patch: CardPatch) => void;
  onDelete: (id: number) => void;
  onToggleTag: (cardId: number, tagId: number) => void;
  onAddChecklistItem: (cardId: number, text: string) => void;
  onToggleChecklistItem: (cardId: number, itemId: number, done: number) => void;
  onRemoveChecklistItem: (cardId: number, itemId: number) => void;
  onLoadActivity: (cardId: number) => Promise<Activity[]>;
  onAddComment: (cardId: number, text: string, author: string) => Promise<Activity | null>;
  onRemoveComment: (cardId: number, activityId: number) => Promise<boolean>;
}

/**
 * Modal editor for a single card
 * (title / Markdown description / due / priority / assignee / tags / checklist).
 */
export default function CardModal({
  card,
  tags,
  open,
  onClose,
  onSave,
  onDelete,
  onToggleTag,
  onAddChecklistItem,
  onToggleChecklistItem,
  onRemoveChecklistItem,
  onLoadActivity,
  onAddComment,
  onRemoveComment,
}: CardModalProps): JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [assignee, setAssignee] = useState<string>('');
  const [priority, setPriority] = useState<number>(0);
  const [completed, setCompleted] = useState<number>(0);
  const [due, setDue] = useState<Dayjs | null>(null);
  const [descTab, setDescTab] = useState<number>(0);
  const [mainTab, setMainTab] = useState<number>(0);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description);
      setAssignee(card.assignee ?? '');
      setPriority(card.priority);
      setCompleted(card.completed);
      setDue(card.dueDate ? dayjs(card.dueDate) : null);
      setDescTab(0);
      setMainTab(0);
    }
  }, [card]);

  const handleSave = (): void => {
    if (!card) return;
    const patch: CardPatch = {
      title: title.trim() || card.title,
      description,
      assignee: assignee.trim(),
      priority,
      completed,
      dueDate: due ? due.toISOString() : null,
    };
    onSave(card.id, patch);
    onClose();
  };

  const dueLabel = card?.dueDate ? formatDueLabel(card.dueDate) : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>编辑卡片</DialogTitle>
      {card && (
        <Box sx={{ px: 3, pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(card.createdAt) ? `创建于 ${formatRelativeTime(card.createdAt)}` : '创建于 —'}
            {' · '}
            {formatRelativeTime(card.updatedAt) ? `更新于 ${formatRelativeTime(card.updatedAt)}` : '更新于 —'}
            {dueLabel && dueLabel.tone === 'overdue' ? ` · 已${dueLabel.text}` : ''}
          </Typography>
        </Box>
      )}
      <DialogContent>
        <Tabs
          value={mainTab}
          onChange={(_, v: number) => setMainTab(v)}
          sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="详情" />
          <Tab
            label={
              card && card.commentCount > 0
                ? `活动与评论 (${card.commentCount})`
                : '活动与评论'
            }
          />
        </Tabs>
        {mainTab === 1 && card ? (
          <Box sx={{ mt: 2 }}>
            <ActivityTimeline
              cardId={card.id}
              onLoad={onLoadActivity}
              onAddComment={onAddComment}
              onRemoveComment={onRemoveComment}
            />
          </Box>
        ) : (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="标题"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Box>
            <Tabs
              value={descTab}
              onChange={(_, v: number) => setDescTab(v)}
              sx={{ minHeight: 36, mb: 1, '& .MuiTab-root': { minHeight: 36, py: 0 } }}
            >
              <Tab label="描述" />
              <Tab label="预览" />
            </Tabs>
            {descTab === 0 ? (
              <TextField
                fullWidth
                multiline
                minRows={4}
                placeholder="支持 Markdown：**粗体**、*斜体*、`代码`、- 列表、# 标题、[链接](https://…)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            ) : (
              <Box
                sx={{
                  minHeight: 108,
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Markdown source={description} empty="（暂无描述）" />
              </Box>
            )}
          </Box>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 120 }}>
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
            <TextField
              label="指派人"
              size="small"
              placeholder="未指派"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              sx={{ minWidth: 140 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={!!completed}
                onChange={(e) => setCompleted(e.target.checked ? 1 : 0)}
              />
              <Typography>已完成</Typography>
            </Box>
          </Stack>
          <Divider />
          {card && (
            <ChecklistEditor
              items={card.checklist ?? []}
              onAdd={(text) => onAddChecklistItem(card.id, text)}
              onToggle={(itemId, done) => onToggleChecklistItem(card.id, itemId, done)}
              onRemove={(itemId) => onRemoveChecklistItem(card.id, itemId)}
            />
          )}
          <Divider />
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
        )}
      </DialogContent>
      <DialogActions>
        <Button color="error" onClick={() => card && onDelete(card.id)}>
          删除
        </Button>
        <Button onClick={onClose}>{mainTab === 1 ? '关闭' : '取消'}</Button>
        <Button variant="contained" onClick={handleSave} disabled={mainTab === 1}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
