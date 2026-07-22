import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Board, Tag } from '../types';

interface ToolbarProps {
  board: Board;
  tags: Tag[];
  filterTagId: number | null;
  onFilterChange: (tagId: number | null) => void;
  onDeleteBoard: () => void;
}

/** Board header: name, tag filter, and delete. */
export default function Toolbar({
  board,
  tags,
  filterTagId,
  onFilterChange,
  onDeleteBoard,
}: ToolbarProps): JSX.Element {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ md: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {board.name}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>按标签筛选</InputLabel>
          <Select
            label="按标签筛选"
            value={filterTagId ?? ''}
            onChange={(e) => onFilterChange(e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">全部</MenuItem>
            {tags.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onDeleteBoard}
        >
          删除看板
        </Button>
      </Stack>
    </Stack>
  );
}
