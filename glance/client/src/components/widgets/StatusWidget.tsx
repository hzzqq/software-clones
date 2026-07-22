import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import WidgetFrame from '../WidgetFrame';
import { proxyApi, StatusResult } from '../../api/proxy';
import { StatusConfig, Widget } from '../../types';

interface StatusWidgetProps {
  widget: Widget;
  onConfigure?: () => void;
  onRemove?: () => void;
}

/** Service-status monitor widget (HTTP probes via backend proxy). */
export default function StatusWidget({
  widget,
  onConfigure,
  onRemove,
}: StatusWidgetProps): JSX.Element {
  const config = widget.config as StatusConfig;
  const items = config.items ?? [];
  const [results, setResults] = useState<Record<string, StatusResult | undefined>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const load = async (): Promise<void> => {
    if (items.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const entries = await Promise.all(
        items.map(async (it) => {
          const r = await proxyApi.status(it.url).catch(
            () => ({ url: it.url, status: 0, ok: false, latencyMs: 0 } as StatusResult)
          );
          return [it.url, r] as const;
        })
      );
      setResults(Object.fromEntries(entries));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id]);

  return (
    <WidgetFrame
      title={widget.title}
      onRefresh={() => void load()}
      onConfigure={onConfigure}
      onRemove={onRemove}
    >
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <CircularProgress size={18} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ my: 1 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={0.5}>
        {items.map((it) => {
          const r = results[it.url];
          return (
            <Stack key={it.url} direction="row" spacing={1} alignItems="center">
              <Typography sx={{ flexGrow: 1 }} noWrap>
                {it.name}
              </Typography>
              {r ? (
                <Chip
                  size="small"
                  label={`${r.status} · ${r.latencyMs}ms`}
                  color={r.ok ? 'success' : 'error'}
                />
              ) : (
                <Chip size="small" label="…" />
              )}
            </Stack>
          );
        })}
        {items.length === 0 && <Typography color="text.secondary">暂无监控项</Typography>}
      </Stack>
    </WidgetFrame>
  );
}
