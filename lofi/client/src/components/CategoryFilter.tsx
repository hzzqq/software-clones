import { Box, Chip, Stack } from '@mui/material';
import { categoryLabel } from '../utils/station';

interface Props {
  categories: string[];
  active?: string;
  onSelect: (c?: string) => void;
}

export default function CategoryFilter({ categories, active, onSelect }: Props): JSX.Element {
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
            label={categoryLabel(c)}
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
