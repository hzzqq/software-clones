import { Box, ToggleButton } from '@mui/material';
import type { Episode } from '../types';

interface Props {
  episodes: Episode[];
  onToggle: (id: number) => void;
}

export default function EpisodeGrid({ episodes, onToggle }: Props): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {episodes.map((ep) => (
        <ToggleButton
          key={ep.id}
          value={ep.id}
          selected={ep.watched}
          onChange={() => onToggle(ep.id)}
          sx={{ borderRadius: 2, px: 1.5 }}
        >
          第 {ep.index} 集
        </ToggleButton>
      ))}
    </Box>
  );
}
