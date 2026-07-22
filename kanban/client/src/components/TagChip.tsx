import { Chip } from '@mui/material';

interface TagChipProps {
  name: string;
  color: string;
  onClick?: () => void;
  onDelete?: () => void;
  selected?: boolean;
}

/** A small colored chip representing a board tag. */
export default function TagChip({
  name,
  color,
  onClick,
  onDelete,
  selected,
}: TagChipProps): JSX.Element {
  return (
    <Chip
      size="small"
      label={name}
      onClick={onClick}
      onDelete={onDelete}
      variant={selected ? 'filled' : 'outlined'}
      sx={{
        bgcolor: selected ? color : 'transparent',
        color: selected ? '#fff' : color,
        borderColor: color,
        '& .MuiChip-label': { color: selected ? '#fff' : color },
        cursor: onClick ? 'pointer' : 'default',
      }}
    />
  );
}
