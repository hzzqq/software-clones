import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import ToolCard from '../components/ToolCard';
import { useFavorites } from '../hooks/useFavorites';

/** Lists the user's favorites; clicking opens the tool, trash removes it. */
export default function FavoritesPage(): JSX.Element {
  const navigate = useNavigate();
  const { favorites, toggle, clearAll, backendOk } = useFavorites();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          收藏夹
        </Typography>
        {favorites.length > 0 && (
          <Button color="error" variant="outlined" size="small" onClick={() => setConfirmOpen(true)}>
            清空收藏
          </Button>
        )}
      </Box>
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
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>清空所有收藏？</DialogTitle>
        <DialogContent>将移除全部 {favorites.length} 个收藏，此操作不可撤销。</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button
            color="error"
            onClick={() => {
              void clearAll();
              setConfirmOpen(false);
            }}
          >
            清空
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
