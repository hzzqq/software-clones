import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card as MuiCard,
  Avatar,
  Box,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ChecklistIcon from '@mui/icons-material/CheckBoxOutlined';
import CommentIcon from '@mui/icons-material/ChatBubbleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { type Card, List, Tag, PRIORITY_LABELS } from '../types';
import { formatDueLabel, clampPriority, type DueTone } from '../utils/filterCards';
import { checklistProgress, checklistSummaryText } from '../utils/checklist';
import { markdownToPlainText } from '../utils/markdown';
import TagChip from './TagChip';

interface CardProps {
  card: Card;
  tags: Tag[];
  /** 全部列表（已按 position 排序），用于「移到某列」快捷菜单。 */
  lists?: List[];
  onClick: () => void;
  onToggleComplete: (id: number, completed: number) => void;
  /** 快捷移动回调；不传则不渲染移动菜单。 */
  onMoveToList?: (cardId: number, listId: number) => void;
  onTagClick?: (tagId: number) => void;
}

const PRIORITY_COLOR: Record<number, 'error' | 'warning' | 'default'> = {
  0: 'default',
  1: 'default',
  2: 'warning',
  3: 'error',
};

// 截止日语义色调 → MUI Chip 颜色
const DUE_TONE_COLOR: Record<DueTone, 'error' | 'warning' | 'info' | 'default'> = {
  overdue: 'error',
  today: 'warning',
  soon: 'info',
  none: 'default',
};

/** A single sortable card inside a column. */
export default function Card({
  card,
  tags,
  lists = [],
  onClick,
  onToggleComplete,
  onMoveToList,
  onTagClick,
}: CardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(card.id) });
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardTags = tags.filter((t) => card.tagIds.includes(t.id));
  const progress = checklistProgress(card.checklist);
  const checklistText: string = checklistSummaryText(card.checklist);
  // 卡片上只展示描述摘要：把 Markdown 压成纯文本并截断，完整渲染在弹窗内。
  const descPreview: string = markdownToPlainText(card.description, 80);
  // 老数据 / 未刷新的载荷可能没有 commentCount，兜底为 0 避免渲染 NaN。
  const commentCount: number = Number.isFinite(card.commentCount) ? card.commentCount : 0;
  const assignee: string = (card.assignee ?? '').trim();
  const assigneeInitial: string = assignee ? Array.from(assignee)[0].toUpperCase() : '';

  const currentIndex: number = lists.findIndex((l) => l.id === card.listId);
  const prevList: List | null = currentIndex > 0 ? lists[currentIndex - 1] : null;
  const nextList: List | null =
    currentIndex >= 0 && currentIndex < lists.length - 1 ? lists[currentIndex + 1] : null;
  const canMove: boolean = typeof onMoveToList === 'function' && lists.length > 1;

  const move = (listId: number): void => {
    setMenuAnchor(null);
    if (onMoveToList) onMoveToList(card.id, listId);
  };

  /**
   * 键盘快捷移动：Alt + ← / → 把卡片挪到相邻列。
   * 其余按键透传给 dnd-kit 的 KeyboardSensor，避免覆盖原有的键盘拖拽能力。
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (canMove && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      const target: List | null = e.key === 'ArrowLeft' ? prevList : nextList;
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        move(target.id);
        return;
      }
    }
    const base = listeners?.onKeyDown;
    if (typeof base === 'function') base(e);
  };

  return (
    <MuiCard
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onKeyDown={handleKeyDown}
      sx={{ p: 1.5, cursor: 'grab', mb: 1 }}
      onClick={onClick}
    >
      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            size="small"
            checked={!!card.completed}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleComplete(card.id, card.completed ? 0 : 1)}
          />
          <Typography
            sx={{
              flexGrow: 1,
              textDecoration: card.completed ? 'line-through' : 'none',
              color: card.completed ? 'text.disabled' : 'inherit',
            }}
          >
            {card.title}
          </Typography>
          {assignee && (
            <Tooltip title={`指派给 ${assignee}`}>
              <Avatar
                sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}
              >
                {assigneeInitial}
              </Avatar>
            </Tooltip>
          )}
          {canMove && (
            <Tooltip title="移动到其他列（Alt + ← / →）">
              <IconButton
                size="small"
                aria-label="move card"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor(e.currentTarget);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {descPreview && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              pl: 4.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {descPreview}
          </Typography>
        )}
        {progress.total > 0 && (
          <Box sx={{ pl: 4.5, pr: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={progress.percent}
              color={progress.percent === 100 ? 'success' : 'primary'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        )}
        {(card.priority > 0 ||
          card.dueDate ||
          cardTags.length > 0 ||
          checklistText ||
          commentCount > 0) && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {card.priority > 0 && (() => {
              const p = clampPriority(card.priority);
              return (
                <Chip
                  size="small"
                  label={PRIORITY_LABELS[p]}
                  color={PRIORITY_COLOR[p]}
                />
              );
            })()}
            {card.dueDate && (() => {
              const due = formatDueLabel(card.dueDate);
              return (
                <Chip
                  size="small"
                  icon={<EventIcon />}
                  label={due.text}
                  color={DUE_TONE_COLOR[due.tone]}
                  variant={due.tone === 'none' ? 'outlined' : 'filled'}
                />
              );
            })()}
            {checklistText && (
              <Chip
                size="small"
                icon={<ChecklistIcon />}
                label={checklistText}
                color={progress.percent === 100 ? 'success' : 'default'}
                variant={progress.percent === 100 ? 'filled' : 'outlined'}
              />
            )}
            {commentCount > 0 && (
              <Tooltip title={`${commentCount} 条评论，点开卡片查看时间线`}>
                <Chip
                  size="small"
                  icon={<CommentIcon />}
                  label={commentCount}
                  variant="outlined"
                />
              </Tooltip>
            )}
            {cardTags.map((t) => (
              <TagChip
                key={t.id}
                name={t.name}
                color={t.color}
                onClick={
                  onTagClick
                    ? (e: React.MouseEvent) => {
                        e.stopPropagation();
                        onTagClick(t.id);
                      }
                    : undefined
                }
              />
            ))}
          </Box>
        )}
      </Stack>
      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem disabled={prevList === null} onClick={() => prevList && move(prevList.id)}>
          <ListItemIcon>
            <ArrowBackIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="移到上一列" secondary={prevList?.title ?? '已是第一列'} />
        </MenuItem>
        <MenuItem disabled={nextList === null} onClick={() => nextList && move(nextList.id)}>
          <ListItemIcon>
            <ArrowForwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="移到下一列" secondary={nextList?.title ?? '已是最后一列'} />
        </MenuItem>
        <Divider />
        {lists
          .filter((l) => l.id !== card.listId)
          .map((l) => (
            <MenuItem key={l.id} onClick={() => move(l.id)}>
              <ListItemText primary={`移到「${l.title}」`} />
            </MenuItem>
          ))}
      </Menu>
    </MuiCard>
  );
}
