import { useState } from 'react';
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Column from './Column';
import {
  applyCardFilters,
  hasActiveFilters,
  sortCards,
  type CardFilterCriteria,
  type CardSort,
} from '../utils/filterCards';
import type { BatchAction } from '../api/lists';
import { Card, List, Tag } from '../types';

interface BoardProps {
  lists: List[];
  cardsByList: Record<number, Card[]>;
  tags: Tag[];
  /** 组合筛选条件，直接交给 applyCardFilters，保证各列口径一致。 */
  criteria: CardFilterCriteria;
  onAddList: (title: string) => void;
  onDeleteList: (id: number) => void;
  onUpdateListWip: (id: number, wipLimit: number) => void;
  onAddCard: (listId: number, title: string) => void;
  onOpenCard: (id: number) => void;
  onToggleComplete: (id: number, completed: number) => void;
  onMoveCardToList: (cardId: number, listId: number) => void;
  onBatchList: (listId: number, action: BatchAction, targetListId?: number) => void;
  onTagClick?: (tagId: number) => void;
}

/** Horizontal board of columns plus an "add list" affordance. */
export default function Board({
  lists,
  cardsByList,
  tags,
  criteria,
  onAddList,
  onDeleteList,
  onUpdateListWip,
  onAddCard,
  onOpenCard,
  onToggleComplete,
  onMoveCardToList,
  onBatchList,
  onTagClick,
}: BoardProps): JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [sortBy, setSortBy] = useState<CardSort>('position');

  const submit = (): void => {
    const value = title.trim();
    if (!value) return;
    onAddList(value);
    setTitle('');
  };

  // 过滤 → 排序：过滤管线统一由 applyCardFilters 负责，这里只补排序。
  const visibleCards = (cards: Card[]): Card[] =>
    sortCards(applyCardFilters(cards, criteria, tags), sortBy);

  const filtering: boolean = hasActiveFilters(criteria);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="card-sort-label">卡片排序</InputLabel>
          <Select
            labelId="card-sort-label"
            label="卡片排序"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as CardSort)}
          >
            <MenuItem value="position">原顺序</MenuItem>
            <MenuItem value="title">按标题</MenuItem>
            <MenuItem value="priority">按优先级</MenuItem>
            <MenuItem value="dueDate">按截止日</MenuItem>
            <MenuItem value="updatedAt">按更新时间</MenuItem>
          </Select>
        </FormControl>
        {filtering && (
          <Typography variant="caption" color="text.secondary">
            筛选已启用，列头计数显示「可见 / 全部」
          </Typography>
        )}
      </Stack>
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {lists.map((list) => {
          const all: Card[] = cardsByList[list.id] ?? [];
          return (
            <Column
              key={list.id}
              list={list}
              lists={lists}
              cards={visibleCards(all)}
              totalCount={all.length}
              totalCompleted={all.filter((c) => c.completed === 1).length}
              filtering={filtering}
              tags={tags}
              onAddCard={onAddCard}
              onDeleteList={onDeleteList}
              onUpdateWip={onUpdateListWip}
              onOpenCard={onOpenCard}
              onToggleComplete={onToggleComplete}
              onMoveCardToList={onMoveCardToList}
              onBatch={onBatchList}
              onTagClick={onTagClick}
            />
          );
        })}

        <Paper sx={{ width: 300, flexShrink: 0, p: 1.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              value={title}
              placeholder="新列表…"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
            <IconButton onClick={submit} aria-label="add list">
              <AddIcon />
            </IconButton>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
