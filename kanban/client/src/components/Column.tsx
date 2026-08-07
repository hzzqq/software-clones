import { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import {
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SpeedIcon from '@mui/icons-material/Speed';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ReplayIcon from '@mui/icons-material/Replay';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import Card from './Card';
import { wipLabel, wipState, type WipState } from '../utils/filterCards';
import type { BatchAction } from '../api/lists';
import { Card as CardType, List, Tag } from '../types';

interface ColumnProps {
  list: List;
  /** 全部列表，供卡片的「移到某列」菜单使用。 */
  lists: List[];
  /** 已按当前筛选/排序处理过的可见卡片。 */
  cards: CardType[];
  /** 该列的卡片总数（不受筛选影响），WIP 判定以此为准。 */
  totalCount: number;
  /** 该列已完成卡片总数（不受筛选影响），批量操作以此判定可用性。 */
  totalCompleted: number;
  /** 当前是否有激活的筛选条件，用于决定列头是否显示「可见 / 全部」。 */
  filtering: boolean;
  tags: Tag[];
  onAddCard: (listId: number, title: string) => void;
  onDeleteList: (id: number) => void;
  onUpdateWip: (listId: number, wipLimit: number) => void;
  onOpenCard: (id: number) => void;
  onToggleComplete: (id: number, completed: number) => void;
  onMoveCardToList: (cardId: number, listId: number) => void;
  /** 列批量操作；move-* 需要传目标列 id。 */
  onBatch: (listId: number, action: BatchAction, targetListId?: number) => void;
  onTagClick?: (tagId: number) => void;
}

/** WIP 状态 → 徽标语义色（'off' 不渲染徽标，故不在映射中）。 */
const WIP_COLOR: Record<Exclude<WipState, 'off'>, 'success' | 'warning' | 'error'> = {
  ok: 'success',
  near: 'warning',
  over: 'error',
};

/** WIP 状态 → 悬停提示文案。 */
const WIP_TIP: Record<Exclude<WipState, 'off'>, string> = {
  ok: '在制品数量正常',
  near: '已达在制品上限，建议先推进现有卡片',
  over: '超出在制品上限，请先完成或移出部分卡片',
};

/** A board column (droppable) containing sortable cards. */
export default function Column({
  list,
  lists,
  cards,
  totalCount,
  totalCompleted,
  filtering,
  tags,
  onAddCard,
  onDeleteList,
  onUpdateWip,
  onOpenCard,
  onToggleComplete,
  onMoveCardToList,
  onBatch,
  onTagClick,
}: ColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}` });
  const [title, setTitle] = useState<string>('');
  const [wipEditing, setWipEditing] = useState<boolean>(false);
  const [wipDraft, setWipDraft] = useState<string>(String(list.wipLimit ?? 0));
  const [batchAnchor, setBatchAnchor] = useState<HTMLElement | null>(null);
  const [moveAnchor, setMoveAnchor] = useState<HTMLElement | null>(null);
  /** 打开「移动到…」子菜单时记录是整列移动还是仅移已完成。 */
  const [moveScope, setMoveScope] = useState<'move-all' | 'move-completed'>('move-all');

  // 外部（如另一处编辑或重新加载）改动上限时，同步草稿值。
  useEffect(() => {
    setWipDraft(String(list.wipLimit ?? 0));
  }, [list.wipLimit]);

  const limit: number = list.wipLimit ?? 0;
  const state: WipState = wipState(totalCount, limit);
  const label: string = wipLabel(totalCount, limit);

  const submit = (): void => {
    const value = title.trim();
    if (!value) return;
    onAddCard(list.id, value);
    setTitle('');
  };

  const commitWip = (): void => {
    setWipEditing(false);
    const parsed: number = Number.parseInt(wipDraft, 10);
    const next: number = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    setWipDraft(String(next));
    if (next !== limit) onUpdateWip(list.id, next);
  };

  const cancelWip = (): void => {
    setWipEditing(false);
    setWipDraft(String(limit));
  };

  // 批量操作以该列的「全部卡片」为对象，不受当前筛选影响，
  // 所以这里用 totalCount / totalCompleted 决定菜单项是否可用。
  const incompleteCount: number = Math.max(0, totalCount - totalCompleted);
  const otherLists: List[] = lists.filter((l) => l.id !== list.id);

  const runBatch = (action: BatchAction, targetListId?: number): void => {
    setBatchAnchor(null);
    setMoveAnchor(null);
    onBatch(list.id, action, targetListId);
  };

  const openMoveMenu = (scope: 'move-all' | 'move-completed', el: HTMLElement): void => {
    setMoveScope(scope);
    setBatchAnchor(null);
    setMoveAnchor(el);
  };

  return (
    <Paper
      ref={setNodeRef}
      sx={{
        width: 300,
        flexShrink: 0,
        p: 1.5,
        bgcolor: isOver ? '#e0f2fe' : '#f8fafc',
        maxHeight: 'calc(100vh - 220px)',
        display: 'flex',
        flexDirection: 'column',
        border: state === 'over' ? '1px solid' : '1px solid transparent',
        borderColor: state === 'over' ? 'error.main' : 'transparent',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography fontWeight={700} sx={{ minWidth: 0, overflow: 'hidden' }} noWrap>
          {list.title}{' '}
          <Typography component="span" color="text.secondary">
            ({filtering ? `${cards.length}/${totalCount}` : totalCount})
          </Typography>
        </Typography>
        <Stack direction="row" spacing={0.25} alignItems="center">
          {label !== '' && state !== 'off' && (
            <Tooltip title={WIP_TIP[state]}>
              <Chip
                size="small"
                color={WIP_COLOR[state]}
                variant={state === 'ok' ? 'outlined' : 'filled'}
                label={`WIP ${label}`}
                onClick={() => setWipEditing(true)}
              />
            </Tooltip>
          )}
          <Tooltip title="设置在制品（WIP）上限">
            <IconButton size="small" onClick={() => setWipEditing(true)} aria-label="set wip limit">
              <SpeedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="批量操作整列卡片">
            <span>
              <IconButton
                size="small"
                aria-label="batch actions"
                disabled={totalCount === 0}
                onClick={(e) => setBatchAnchor(e.currentTarget)}
              >
                <PlaylistAddCheckIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton size="small" onClick={() => onDeleteList(list.id)} aria-label="delete list">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {wipEditing && (
        <Box sx={{ mb: 1 }}>
          <TextField
            size="small"
            fullWidth
            autoFocus
            type="number"
            label="WIP 上限（0 表示不限）"
            value={wipDraft}
            inputProps={{ min: 0, step: 1 }}
            onChange={(e) => setWipDraft(e.target.value)}
            onBlur={commitWip}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitWip();
              if (e.key === 'Escape') cancelWip();
            }}
          />
        </Box>
      )}

      <SortableContext items={cards.map((c) => String(c.id))}>
        <Box sx={{ overflowY: 'auto', flexGrow: 1, minHeight: 40 }}>
          {cards.length === 0 ? (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                color: 'text.secondary',
                fontSize: 13,
              }}
            >
              {filtering && totalCount > 0
                ? '当前筛选下没有匹配的卡片'
                : '暂无卡片，拖拽到此或上方输入框添加'}
            </Box>
          ) : (
            cards.map((c) => (
              <Card
                key={c.id}
                card={c}
                tags={tags}
                lists={lists}
                onClick={() => onOpenCard(c.id)}
                onToggleComplete={onToggleComplete}
                onMoveToList={onMoveCardToList}
                onTagClick={onTagClick}
              />
            ))
          )}
        </Box>
      </SortableContext>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={title}
          placeholder="新卡片…"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <IconButton onClick={submit} aria-label="add card">
          <AddIcon />
        </IconButton>
      </Stack>

      <Menu
        anchorEl={batchAnchor}
        open={batchAnchor !== null}
        onClose={() => setBatchAnchor(null)}
      >
        <MenuItem
          disabled={incompleteCount === 0}
          onClick={() => runBatch('complete-all')}
        >
          <ListItemIcon>
            <DoneAllIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="全部标记为已完成"
            secondary={incompleteCount > 0 ? `${incompleteCount} 张未完成` : '没有未完成卡片'}
          />
        </MenuItem>
        <MenuItem disabled={totalCompleted === 0} onClick={() => runBatch('reopen-all')}>
          <ListItemIcon>
            <ReplayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="全部重新打开"
            secondary={totalCompleted > 0 ? `${totalCompleted} 张已完成` : '没有已完成卡片'}
          />
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={totalCompleted === 0 || otherLists.length === 0}
          onClick={(e) => openMoveMenu('move-completed', e.currentTarget)}
        >
          <ListItemIcon>
            <DriveFileMoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="已完成卡片移到…"
            secondary={otherLists.length === 0 ? '没有其他列' : `${totalCompleted} 张已完成`}
          />
        </MenuItem>
        <MenuItem
          disabled={totalCount === 0 || otherLists.length === 0}
          onClick={(e) => openMoveMenu('move-all', e.currentTarget)}
        >
          <ListItemIcon>
            <DriveFileMoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="整列卡片移到…"
            secondary={otherLists.length === 0 ? '没有其他列' : `${totalCount} 张卡片`}
          />
        </MenuItem>
        <Divider />
        <MenuItem
          disabled={totalCompleted === 0}
          onClick={() => runBatch('clear-completed')}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <ClearAllIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="清空已完成卡片"
            secondary={totalCompleted > 0 ? `将删除 ${totalCompleted} 张，不可撤销` : '没有已完成卡片'}
          />
        </MenuItem>
      </Menu>

      <Menu anchorEl={moveAnchor} open={moveAnchor !== null} onClose={() => setMoveAnchor(null)}>
        <MenuItem disabled>
          <ListItemText
            primary={moveScope === 'move-all' ? '整列移动到' : '已完成卡片移动到'}
          />
        </MenuItem>
        <Divider />
        {otherLists.map((l) => (
          <MenuItem key={l.id} onClick={() => runBatch(moveScope, l.id)}>
            <ListItemText primary={l.title} />
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}
