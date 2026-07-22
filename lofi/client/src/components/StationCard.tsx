import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { Station } from '../types';
import { categoryLabel, truncate } from '../utils/station';

interface Props {
  station: Station;
  active: boolean;
  onPlay: (s: Station) => void;
}

export default function StationCard({ station, active, onPlay }: Props): JSX.Element {
  return (
    <Card
      variant="outlined"
      sx={active ? { borderColor: 'primary.main', borderWidth: 2 } : undefined}
    >
      <CardActionArea onClick={() => onPlay(station)}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              {station.name}
            </Typography>
            <Chip size="small" label={categoryLabel(station.category)} />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {truncate(station.description, 60)}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <PlayCircleOutlineIcon fontSize="small" color="primary" />
            <Typography variant="caption">{station.likes} 喜欢</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
