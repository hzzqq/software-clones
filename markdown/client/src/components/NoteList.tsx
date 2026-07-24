import { List, ListItemButton, ListItemText, Typography, Box, Chip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import type { Note } from '../types';
import { truncateText, formatRelativeTime } from '../utils/markdown';

interface Props {
  notes: Note[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export default function NoteList({ notes, activeId, onSelect }: Props): JSX.Element {
  if (notes.length === 0) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
        还没有笔记，点右上角「新建」开始。
      </Typography>
    );
  }
  return (
    <List dense>
      {notes.map((n) => (
        <ListItemButton
          key={n.id}
          selected={n.id === activeId}
          onClick={() => onSelect(n.id)}
        >
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {n.pinned && <PushPinIcon fontSize="small" color="primary" />}
                <Typography noWrap sx={{ maxWidth: '70%' }}>
                  {truncateText(n.title || '无标题', 40)}
                </Typography>
              </Box>
            }
            secondary={
              <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <span>{n.folder || '未分类'}</span>
                {n.updatedAt && (
                  <Typography component="span" variant="caption" color="text.secondary">
                    · {formatRelativeTime(n.updatedAt)}
                  </Typography>
                )}
              </Box>
            }
          />
          {n.tags.length > 0 && (
            <Chip size="small" label={`#${n.tags[0]}`} sx={{ ml: 1 }} />
          )}
        </ListItemButton>
      ))}
    </List>
  );
}
