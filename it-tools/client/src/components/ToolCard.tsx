import { Card, CardActionArea, CardContent, IconButton, Typography, Box } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { Favorite } from '../api/favorites';

interface ToolCardProps {
  favorite: Favorite;
  onOpen: (toolKey: string) => void;
  onRemove: (id: number, toolKey: string) => void;
}

/**
 * A single favorite row in the Favorites page. Clicking the card navigates to
 * the associated tool; the trash icon removes the favorite.
 */
export default function ToolCard({ favorite, onOpen, onRemove }: ToolCardProps): JSX.Element {
  return (
    <Card sx={{ mb: 1.5 }}>
      <CardActionArea onClick={() => onOpen(favorite.toolKey)}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {favorite.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {favorite.toolKey}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
      <Box sx={{ position: 'absolute', top: 6, right: 6 }}>
        <IconButton
          size="small"
          aria-label="remove favorite"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(favorite.id, favorite.toolKey);
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    </Card>
  );
}
