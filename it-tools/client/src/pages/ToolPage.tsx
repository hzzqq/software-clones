import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import { getTool } from '../tools/registry';
import { useFavorites } from '../hooks/useFavorites';
import FavoriteButton from '../components/FavoriteButton';
import { historyApi } from '../api/history';

/** Renders the tool selected by the `:key` route parameter. */
export default function ToolPage(): JSX.Element {
  const { key } = useParams<{ key: string }>();
  const tool = key ? getTool(key) : undefined;
  const { isFavorite, toggle, backendOk } = useFavorites();

  useEffect(() => {
    if (tool) {
      // Best-effort usage history (silently ignored if backend is down).
      void historyApi.create({ toolKey: tool.key, summary: tool.title }).catch(() => undefined);
    }
  }, [tool]);

  if (!tool) {
    return <Alert severity="warning">未找到工具：{key}</Alert>;
  }

  const ToolComponent = tool.Component;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {tool.title}
          </Typography>
          {tool.description && (
            <Typography color="text.secondary" variant="body2">
              {tool.description}
            </Typography>
          )}
        </Box>
        <FavoriteButton
          active={isFavorite(tool.key)}
          onClick={() => void toggle(tool.key, tool.title, '')}
        />
      </Box>
      {!backendOk && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          后端未连接，收藏/历史已降级为本地存储。
        </Alert>
      )}
      <Divider />
      <ToolComponent />
      <Box sx={{ height: 16 }} />
    </Stack>
  );
}
