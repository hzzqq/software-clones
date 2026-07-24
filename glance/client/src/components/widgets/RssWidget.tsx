import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Link, List, ListItem, Typography } from '@mui/material';
import WidgetFrame from '../WidgetFrame';
import { proxyApi, RssFeed } from '../../api/proxy';
import { RssConfig, Widget } from '../../types';
import { formatRelativeTime } from '../../utils/time';

interface RssWidgetProps {
  widget: Widget;
  onConfigure?: () => void;
  onRemove?: () => void;
}

/** RSS / Atom feed widget (data fetched via the backend proxy). */
export default function RssWidget({
  widget,
  onConfigure,
  onRemove,
}: RssWidgetProps): JSX.Element {
  const config = widget.config as RssConfig;
  const [feed, setFeed] = useState<RssFeed | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const load = async (): Promise<void> => {
    if (!config.url) return;
    setLoading(true);
    setError('');
    try {
      const f: RssFeed = await proxyApi.rss(config.url);
      setFeed(f);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.url]);

  return (
    <WidgetFrame
      title={widget.title}
      onRefresh={() => void load()}
      onConfigure={onConfigure}
      onRemove={onRemove}
    >
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ my: 1 }}>
          {error}
        </Alert>
      )}
      {feed && (
        <List dense>
          {feed.items.map((it, i) => {
            const relTime = formatRelativeTime(it.pubDate);
            return (
              <ListItem key={i} sx={{ display: 'block', py: 0.5 }}>
                <Link href={it.link} target="_blank" rel="noreferrer" underline="hover" color="inherit">
                  {it.title}
                </Link>
                {relTime && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {relTime}
                  </Typography>
                )}
              </ListItem>
            );
          })}
          {feed.items.length === 0 && (
            <Typography color="text.secondary">暂无条目</Typography>
          )}
        </List>
      )}
    </WidgetFrame>
  );
}
