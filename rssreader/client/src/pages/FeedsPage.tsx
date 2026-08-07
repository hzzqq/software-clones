import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import { useFeeds } from '../hooks/useFeeds';
import { Feed } from '../types';
import { formatDateTime } from '../utils/format';
import { normalizeFeedUrl } from '../utils/feedUrl';

/** 添加订阅弹窗。 */
function AddFeedDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { url: string; category?: string }) => Promise<unknown>;
}): JSX.Element {
  const [url, setUrl] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setUrl('');
      setCategory('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const normalized = normalizeFeedUrl(url);
    if (!normalized) {
      setError('请输入合法的订阅源网址（仅支持 http/https）');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onAdd({ url: normalized, category: category.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>添加订阅源</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="RSS / Atom 订阅地址"
            placeholder="https://example.com/feed.xml"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            sx={{ mb: 2 }}
            helperText="可省略协议，将自动补全为 https://；添加时会立即抓取并解析"
          />
          <TextField
            fullWidth
            label="分类（可选）"
            placeholder="例如：技术 / 新闻"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            helperText="留空则归入「默认」分类"
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button variant="contained" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? '抓取中…' : '添加订阅'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * 订阅源管理页：列出全部订阅（未读数 / 文章数 / 最近抓取），
 * 支持添加、删除、手动刷新。
 */
export default function FeedsPage(): JSX.Element {
  const { feeds, loading, error, add, remove, refreshOne } = useFeeds();
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feed | null>(null);

  const handleRefresh = async (feed: Feed): Promise<void> => {
    setRefreshingId(feed.id);
    try {
      await refreshOne(feed.id);
    } finally {
      setRefreshingId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          订阅源
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          添加订阅
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : feeds.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <RssFeedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              还没有订阅源。粘贴一个 RSS/Atom 地址，开始聚合阅读。
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              添加第一个订阅
            </Button>
          </CardContent>
        </Card>
      ) : (
        feeds.map((feed) => (
          <Card key={feed.id} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <RssFeedIcon fontSize="small" color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
                  {feed.title}
                </Typography>
                <Chip size="small" label={`${feed.unreadCount} 未读`} color={feed.unreadCount > 0 ? 'primary' : 'default'} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                {feed.url}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip size="small" label={`分类：${feed.category}`} variant="outlined" />
                <Chip size="small" label={`文章 ${feed.itemCount} 篇`} variant="outlined" />
                <Chip
                  size="small"
                  label={feed.lastFetchedAt ? `最近抓取 ${formatDateTime(feed.lastFetchedAt)}` : '尚未抓取'}
                  variant="outlined"
                />
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <Tooltip title="手动刷新">
                    <IconButton size="small" disabled={refreshingId === feed.id} onClick={() => void handleRefresh(feed)}>
                      {refreshingId === feed.id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <RefreshIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="删除订阅">
                    <IconButton size="small" onClick={() => setDeleteTarget(feed)}>
                      <DeleteOutlineIcon fontSize="small" color="error" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <AddFeedDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={add} />

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>删除订阅</DialogTitle>
        <DialogContent>
          <Typography>
            确定删除订阅「{deleteTarget?.title}」吗？该订阅源下的 {deleteTarget?.itemCount} 篇文章也会一并删除。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteTarget) void remove(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
