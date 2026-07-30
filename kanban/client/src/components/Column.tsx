import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import Card from './Card';
import { Card as CardType, List, Tag } from '../types';

interface ColumnProps {
  list: List;
  cards: CardType[];
  tags: Tag[];
  onAddCard: (listId: number, title: string) => void;
  onDeleteList: (id: number) => void;
  onOpenCard: (id: number) => void;
  onToggleComplete: (id: number, completed: number) => void;
  onTagClick?: (tagId: number) => void;
}

/** A board column (droppable) containing sortable cards. */
export default function Column({
  list,
  cards,
  tags,
  onAddCard,
  onDeleteList,
  onOpenCard,
  onToggleComplete,
  onTagClick,
}: ColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}` });
  const [title, setTitle] = useState<string>('');

  const submit = (): void => {
    const value = title.trim();
    if (!value) return;
    onAddCard(list.id, value);
    setTitle('');
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
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography fontWeight={700}>
          {list.title} <Typography component="span" color="text.secondary">({cards.length})</Typography>
        </Typography>
        <IconButton size="small" onClick={() => onDeleteList(list.id)} aria-label="delete list">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

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
              暂无卡片，拖拽到此或上方输入框添加
            </Box>
          ) : (
            cards.map((c) => (
              <Card
                key={c.id}
                card={c}
                tags={tags}
                onClick={() => onOpenCard(c.id)}
                onToggleComplete={onToggleComplete}
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
    </Paper>
  );
}
