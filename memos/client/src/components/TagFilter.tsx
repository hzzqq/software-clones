import { Box, Chip, Stack } from '@mui/material';
import { Tag } from '../types';

interface Props {
  tags: Tag[];
  active?: string;
  onSelect: (name?: string) => void;
}

export default function TagFilter({ tags, active, onSelect }: Props): JSX.Element | null {
  if (!tags.length) return null;
  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label="全部"
          size="small"
          variant={active ? 'outlined' : 'filled'}
          color={active ? 'default' : 'primary'}
          onClick={() => onSelect(undefined)}
        />
        {tags.map((t) => (
          <Chip
            key={t.id}
            label={`#${t.name} (${t.count})`}
            size="small"
            variant={active === t.name ? 'filled' : 'outlined'}
            color={active === t.name ? 'primary' : 'default'}
            onClick={() => onSelect(active === t.name ? undefined : t.name)}
          />
        ))}
      </Stack>
    </Box>
  );
}
