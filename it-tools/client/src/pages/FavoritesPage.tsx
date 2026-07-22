import { useNavigate } from 'react-router-dom';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ToolCard from '../components/ToolCard';
import { useFavorites } from '../hooks/useFavorites';

/** Lists the user's favorites; clicking opens the tool, trash removes it. */
export default function FavoritesPage(): JSX.Element {
  const navigate = useNavigate();
  const { favorites, toggle, backendOk } = useFavorites();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        收藏夹
      </Typography>
      {!backendOk && (
        <Alert severity="info" sx={{ mb: 2 }}>
          后端未连接，当前收藏保存在本地（localStorage）。
        </Alert>
      )}
      {favorites.length === 0 ? (
        <Typography color="text.secondary">还没有收藏任何工具。</Typography>
      ) : (
        <Stack>
          {favorites.map((f) => (
            <ToolCard
              key={`${f.id}-${f.toolKey}`}
              favorite={f}
              onOpen={(k) => navigate(`/tool/${k}`)}
              onRemove={(_id, k) => void toggle(k, f.title, f.data)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
