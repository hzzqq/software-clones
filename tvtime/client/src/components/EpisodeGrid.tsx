import { Box, ToggleButton } from '@mui/material';
import type { Episode } from '../types';
import { formatEpisodeCode } from '../utils/show';

interface Props {
  episodes: Episode[];
  onToggle: (id: number) => void;
}

export default function EpisodeGrid({ episodes, onToggle }: Props): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {episodes.map((ep) => {
        const code = formatEpisodeCode(ep.season ?? 1, ep.number ?? ep.index);
        return (
          <ToggleButton
            key={ep.id}
            value={ep.id}
            selected={ep.watched}
            onChange={() => onToggle(ep.id)}
            sx={{ borderRadius: 2, px: 1.5, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}
          >
            <Box component="span" sx={{ fontWeight: 700 }}>{code}</Box>
            <Box component="span" sx={{ fontSize: 11, opacity: 0.7 }}>第 {ep.index} 集</Box>
          </ToggleButton>
        );
      })}
    </Box>
  );
}
