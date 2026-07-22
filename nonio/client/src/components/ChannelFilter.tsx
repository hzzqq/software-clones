import { Box, Chip, Stack } from '@mui/material';
import type { Channel } from '../types';

interface Props {
  channels: Channel[];
  activeId: number | null;
  onSelect: (id: number | null) => void;
}

export default function ChannelFilter({ channels, activeId, onSelect }: Props): JSX.Element {
  return (
    <Box sx={{ overflowX: 'auto', py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'nowrap' }}>
        <Chip
          label="全部"
          color={activeId === null ? 'primary' : 'default'}
          onClick={() => onSelect(null)}
        />
        {channels.map((c) => (
          <Chip
            key={c.id}
            label={`${c.name} · ${c.postCount}`}
            color={activeId === c.id ? 'primary' : 'default'}
            variant={activeId === c.id ? 'filled' : 'outlined'}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </Stack>
    </Box>
  );
}
