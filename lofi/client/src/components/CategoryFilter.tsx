import { Box, Chip, Stack } from '@mui/material';
import { categoryLabel } from '../utils/station';

interface Props {
  categories: string[];
  active?: string;
  counts?: Record<string, number>;
  onSelect: (c?: string) => void;
}

export default function CategoryFilter({ categories, active, counts, onSelect }: Props): JSX.Element {
  const countOf = (c: string): number => counts?.[c] ?? 0;
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
        {categories.map((c) => (
          <Chip
            key={c}
            label={`${categoryLabel(c)}（${countOf(c)}）`}
            size="small"
            variant={active === c ? 'filled' : 'outlined'}
            color={active === c ? 'primary' : 'default'}
            onClick={() => onSelect(active === c ? undefined : c)}
          />
        ))}
      </Stack>
    </Box>
  );
}
