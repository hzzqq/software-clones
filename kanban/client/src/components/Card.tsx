import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card as MuiCard,
  Box,
  Checkbox,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { type Card, Tag, PRIORITY_LABELS } from '../types';
import TagChip from './TagChip';

interface CardProps {
  card: Card;
  tags: Tag[];
  onClick: () => void;
  onToggleComplete: (id: number, completed: number) => void;
}

const PRIORITY_COLOR: Record<number, 'error' | 'warning' | 'default'> = {
  0: 'default',
  1: 'default',
  2: 'warning',
  3: 'error',
};

/** A single sortable card inside a column. */
export default function Card({
  card,
  tags,
  onClick,
  onToggleComplete,
}: CardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(card.id) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardTags = tags.filter((t) => card.tagIds.includes(t.id));

  return (
    <MuiCard
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
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
        </Box>
        {(card.priority > 0 || card.dueDate || cardTags.length > 0) && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {card.priority > 0 && (
              <Chip
                size="small"
                label={PRIORITY_LABELS[card.priority]}
                color={PRIORITY_COLOR[card.priority]}
              />
            )}
            {card.dueDate && (
              <Chip
                size="small"
                icon={<EventIcon />}
                label={card.dueDate.slice(0, 10)}
                variant="outlined"
              />
            )}
            {cardTags.map((t) => (
              <TagChip key={t.id} name={t.name} color={t.color} />
            ))}
          </Box>
        )}
      </Stack>
    </MuiCard>
  );
}
