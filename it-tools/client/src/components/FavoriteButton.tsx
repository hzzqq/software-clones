import { IconButton, Tooltip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

interface FavoriteButtonProps {
  active: boolean;
  onClick: () => void;
}

/**
 * Star/toggle button indicating whether the current tool is favorited.
 * Purely presentational — the parent owns the toggle logic.
 */
export default function FavoriteButton({ active, onClick }: FavoriteButtonProps): JSX.Element {
  return (
    <Tooltip title={active ? '取消收藏' : '收藏此工具'}>
      <IconButton color="error" onClick={onClick} aria-label="toggle favorite">
        {active ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      </IconButton>
    </Tooltip>
  );
}
