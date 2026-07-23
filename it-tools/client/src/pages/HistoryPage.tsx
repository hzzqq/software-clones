import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { historyApi, History } from '../api/history';
import { getTool } from '../tools/registry';

/** Lists recently used tools via the history API; clicking opens the tool. */
export default function HistoryPage(): JSX.Element {
  const navigate = useNavigate();
  const [items, setItems] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyApi
      .list(50)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        最近使用
      </Typography>
      {loading ? (
        <Typography color="text.secondary">加载中…</Typography>
      ) : items.length === 0 ? (
        <Alert severity="info">还没有使用记录。</Alert>
      ) : (
        <List dense>
          {items.map((h) => {
            const tool = getTool(h.toolKey);
            return (
              <ListItemButton key={h.id} onClick={() => navigate(`/tool/${h.toolKey}`)}>
                <ListItemText primary={tool?.title ?? h.toolKey} secondary={h.summary} />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}
