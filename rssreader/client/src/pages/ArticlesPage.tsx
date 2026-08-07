import { useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useFeeds } from '../hooks/useFeeds';
import { useArticles } from '../hooks/useArticles';
import ArticleCard from '../components/ArticleCard';

/**
 * 文章列表页：按订阅源 / 未读 / 关键词筛选，支持全部标已读。
 */
export default function ArticlesPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const feedIdParam = searchParams.get('feedId');
  const unreadParam = searchParams.get('unread') === 'true';
  const qParam = searchParams.get('q') ?? '';

  const { feeds } = useFeeds();
  const feedId = feedIdParam && feedIdParam !== 'all' ? Number(feedIdParam) : undefined;
  const { articles, totalUnread, loading, error, markAllRead } = useArticles({
    feedId,
    unread: unreadParam,
    q: qParam || undefined,
  });

  const [searchInput, setSearchInput] = useState<string>(qParam);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  const updateParam = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          文章
          {totalUnread > 0 && (
            <Chip size="small" label={`${totalUnread} 未读`} color="primary" sx={{ ml: 1 }} />
          )}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DoneAllIcon />}
          onClick={() => void markAllRead(feedId)}
        >
          全部标为已读
        </Button>
        <Button component={RouterLink} to="/feeds" variant="outlined" color="inherit">
          管理订阅源
        </Button>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="feed-filter-label">订阅源</InputLabel>
          <Select
            labelId="feed-filter-label"
            label="订阅源"
            value={feedIdParam ?? 'all'}
            onChange={(e) => updateParam('feedId', e.target.value)}
          >
            <MenuItem value="all">全部订阅</MenuItem>
            {feeds.map((feed) => (
              <MenuItem key={feed.id} value={String(feed.id)}>
                {feed.title}（{feed.unreadCount}）
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="unread-filter-label">状态</InputLabel>
          <Select
            labelId="unread-filter-label"
            label="状态"
            value={unreadParam ? 'unread' : 'all'}
            onChange={(e) => updateParam('unread', e.target.value === 'unread' ? 'true' : 'all')}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="unread">只看未读</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="搜索标题 / 摘要 / 正文"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateParam('q', searchInput.trim());
          }}
          sx={{ flexGrow: 1 }}
        />
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : articles.length === 0 ? (
        <Alert severity="info">暂无文章。请先在「管理订阅源」添加订阅并抓取。</Alert>
      ) : (
        articles.map((article) => <ArticleCard key={article.id} article={article} />)
      )}
    </Box>
  );
}
