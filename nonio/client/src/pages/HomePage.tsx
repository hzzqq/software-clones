import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import { channelApi } from '../api/channels';
import { postApi } from '../api/posts';
import type { Channel, Post } from '../types';
import PostCard from '../components/PostCard';
import { parseTags, searchPosts, topPosts, summarizePosts, filterPostsByChannel, countPostsByChannel, sortPosts, formatCompactNumber } from '../utils/forum';

export default function HomePage(): JSX.Element {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'likes' | 'comments'>('newest');

  // 发帖弹窗
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ channelId: '', title: '', body: '', author: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cs, ps] = await Promise.all([channelApi.list(), postApi.list()]);
      setChannels(cs);
      setPosts(ps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const channelFiltered = useMemo(() => filterPostsByChannel(posts, activeChannel), [posts, activeChannel]);
  const channelPostCounts = useMemo(() => countPostsByChannel(posts), [posts]);

  const filtered = useMemo(() => searchPosts(query, null, channelFiltered), [channelFiltered, query]);

  const summary = useMemo(() => summarizePosts(filtered), [filtered]);

  const sorted = useMemo(() => sortPosts(filtered, sort), [filtered, sort]);

  const hotPosts = useMemo(() => topPosts(posts, 3, 'likes'), [posts]);

  const handleLike = async (id: number) => {
    try {
      const updated = await postApi.like(id);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch {
      /* 忽略点赞失败 */
    }
  };

  const handleCreate = async () => {
    if (!form.channelId || !form.title.trim()) return;
    try {
      const created = await postApi.create({
        channelId: Number(form.channelId),
        title: form.title.trim(),
        body: form.body,
        authorName: form.author || undefined,
        tags: parseTags(form.body),
      });
      setPosts((prev) => [created, ...prev]);
      setChannels((prev) =>
        prev.map((c) => (c.id === created.channelId ? { ...c, postCount: c.postCount + 1 } : c)),
      );
      setOpen(false);
      setForm({ channelId: '', title: '', body: '', author: '' });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">社区广场</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          发帖
        </Button>
      </Stack>

      <FormControl size="small" sx={{ minWidth: 160, mt: 1, mb: 0.5 }}>
        <InputLabel>按频道筛选</InputLabel>
        <Select
          label="按频道筛选"
          value={activeChannel ?? ''}
          onChange={(e) => setActiveChannel(e.target.value === '' ? null : Number(e.target.value))}
        >
          <MenuItem value="">全部频道</MenuItem>
          {channels.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}（{channelPostCounts[c.id] ?? 0}）
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Chip size="small" color="primary" variant="outlined" label={`共 ${summary.total} 篇 · ${summary.channels} 个频道 · ♥ ${summary.totalLikes} · 💬 ${summary.totalComments}`} />
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="搜索帖子…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ my: 1 }}
        InputProps={{
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setQuery('')} aria-label="清空搜索">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
      {query && !loading && (
        <Typography variant="caption" color="text.secondary">
          找到 {filtered.length} 条匹配“{query}”的帖子
        </Typography>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>排序</InputLabel>
          <Select
            label="排序"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'newest' | 'likes' | 'comments')}
          >
            <MenuItem value="newest">最新发布</MenuItem>
            <MenuItem value="likes">最多点赞</MenuItem>
            <MenuItem value="comments">最多评论</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {!query && activeChannel === null && !loading && hotPosts.length > 0 && (
        <Box sx={{ my: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>🔥 热门帖子</Typography>
          <Stack spacing={1}>
            {hotPosts.map((p, i) => (
              <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                  {i + 1}. {p.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">♥ {formatCompactNumber(p.likes)}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {!loading && !error && sorted.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          这里还没有帖子，来发第一条吧。
        </Typography>
      )}
      {!loading && sorted.map((p) => <PostCard key={p.id} post={p} onLike={handleLike} />)}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>发布新帖</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label="频道"
            value={form.channelId}
            onChange={(e) => setForm({ ...form, channelId: e.target.value })}
          >
            {channels.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            margin="dense"
            label="标题"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            multiline
            minRows={4}
            label="正文（支持 #标签）"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <TextField
            fullWidth
            margin="dense"
            label="昵称（可选）"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.channelId || !form.title.trim()}>
            发布
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
