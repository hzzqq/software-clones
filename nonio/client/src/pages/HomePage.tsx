import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
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
import ChannelFilter from '../components/ChannelFilter';
import PostCard from '../components/PostCard';
import { parseTags } from '../utils/forum';

export default function HomePage(): JSX.Element {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<number | null>(null);
  const [query, setQuery] = useState('');

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

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (activeChannel && p.channelId !== activeChannel) return false;
      if (query && !`${p.title} ${p.body}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [posts, activeChannel, query]);

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

      <ChannelFilter channels={channels} activeId={activeChannel} onSelect={setActiveChannel} />

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

      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {!loading && !error && filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          这里还没有帖子，来发第一条吧。
        </Typography>
      )}
      {!loading && filtered.map((p) => <PostCard key={p.id} post={p} onLike={handleLike} />)}

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
