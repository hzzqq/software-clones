import { Card, CardContent, Typography, LinearProgress, Stack, Chip, IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link as RouterLink } from 'react-router-dom';
import type { Show } from '../types';
import { progressPercent, isComplete } from '../utils/show';
import { formatRelativeTime } from '../utils/time';

interface Props {
  show: Show;
  onDelete: (id: number) => void;
}

export default function ShowCard({ show, onDelete }: Props): JSX.Element {
  const pct = progressPercent(show.watchedCount, show.totalEpisodes);
  const updatedLabel = formatRelativeTime(show.updatedAt);
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography
            variant="h6"
            component={RouterLink}
            to={`/shows/${show.id}`}
            sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
          >
            {show.title}
          </Typography>
          <IconButton size="small" onClick={() => onDelete(show.id)} aria-label="删除">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
        <LinearProgress variant="determinate" value={pct} sx={{ my: 1, height: 8, borderRadius: 4 }} />
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={`${show.watchedCount}/${show.totalEpisodes}`} />
          <Chip size="small" label={`${pct}%`} color={isComplete(show.watchedCount, show.totalEpisodes) ? 'success' : 'default'} />
          {updatedLabel && (
            <Typography variant="caption" color="text.secondary">
              更新于 {updatedLabel}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
