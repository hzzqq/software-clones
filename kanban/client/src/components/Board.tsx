import { useState } from 'react';
import { Box, IconButton, Paper, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Column from './Column';
import { filterCardsByQuery } from '../utils/filterCards';
import { Card, List, Tag } from '../types';

interface BoardProps {
  lists: List[];
  cardsByList: Record<number, Card[]>;
  tags: Tag[];
  filterTagId: number | null;
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
  searchQuery,
  onAddList,
  onDeleteList,
  onAddCard,
  onOpenCard,
  onToggleComplete,
}: BoardProps): JSX.Element {
  const [title, setTitle] = useState<string>('');

  const submit = (): void => {
    const value = title.trim();
    if (!value) return;
    onAddList(value);
    setTitle('');
  };

  const visibleCards = (cards: Card[]): Card[] => {
    const byTag =
      filterTagId === null ? cards : cards.filter((c) => c.tagIds.includes(filterTagId));
    return filterCardsByQuery(searchQuery, byTag);
  };

  return (
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
  );
}
