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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Column from './Column';
import { filterCardsByQuery, sortCards, filterCardsByPriority, filterCardsByCompleted, type CardSort } from '../utils/filterCards';
import { Card, List, Tag } from '../types';

interface BoardProps {
  lists: List[];
  cardsByList: Record<number, Card[]>;
  tags: Tag[];
  filterTagId: number | null;
  filterPriority: number | null;
  onlyIncomplete: boolean;
  searchQuery: string;
  onAddList: (title: string) => void;
  onDeleteList: (id: number) => void;
  onAddCard: (listId: number, title: string) => void;
  onOpenCard: (id: number) => void;
  onToggleComplete: (id: number, completed: number) => void;
}

/** Horizontal board of columns plus an "add list" affordance. */
export default function Board({
  lists,
  cardsByList,
  tags,
  filterTagId,
  filterPriority,
  onlyIncomplete,
  searchQuery,
  onAddList,
  onDeleteList,
  onAddCard,
  onOpenCard,
  onToggleComplete,
}: BoardProps): JSX.Element {
  const [title, setTitle] = useState<string>('');
  const [sortBy, setSortBy] = useState<CardSort>('position');

  const submit = (): void => {
    const value = title.trim();
    if (!value) return;
    onAddList(value);
    setTitle('');
  };

  const visibleCards = (cards: Card[]): Card[] => {
    const byTag =
      filterTagId === null ? cards : cards.filter((c) => c.tagIds.includes(filterTagId));
    const byPriority = filterCardsByPriority(byTag, filterPriority);
    const byCompleted = filterCardsByCompleted(byPriority, onlyIncomplete);
    return sortCards(filterCardsByQuery(searchQuery, byCompleted), sortBy);
  };

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
      </Stack>
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
      {lists.map((list) => (
        <Column
          key={list.id}
          list={list}
          cards={visibleCards(cardsByList[list.id] ?? [])}
          tags={tags}
          onAddCard={onAddCard}
          onDeleteList={onDeleteList}
          onOpenCard={onOpenCard}
          onToggleComplete={onToggleComplete}
        />
      ))}

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
