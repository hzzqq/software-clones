import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { showApi } from '../api/shows';
import type { Show } from '../types';
import ShowCard from '../components/ShowCard';

export default function ShowsPage(): JSX.Element {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', totalEpisodes: '12', note: '' });

  const filtered = q.trim()
    ? shows.filter((s) => s.title.toLowerCase().includes(q.trim().toLowerCase()))
    : shows;

  const load = async () => {
    setLoading(true);
    try {
      setShows(await showApi.list());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    try {
      await showApi.create({
        title: form.title.trim(),
        totalEpisodes: Number(form.totalEpisodes) || 1,
        note: form.note,
      });
      setOpen(false);
      setForm({ title: '', totalEpisodes: '12', note: '' });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await showApi.remove(id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">我的剧集</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          添加剧集
        </Button>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="搜索剧集名称…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ my: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: q ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setQ('')} aria-label="清空搜索">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {!loading && !error && shows.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          还没有追的剧，点「添加剧集」开始记录吧。
        </Typography>
      )}
      {!loading && !error && shows.length > 0 && filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          没有匹配“{q}”的剧集。
        </Typography>
      )}
      {!loading && filtered.map((s) => <ShowCard key={s.id} show={s} onDelete={handleDelete} />)}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>添加剧集</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="dense" label="剧集名称" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="总集数" type="number" value={form.totalEpisodes}
            onChange={(e) => setForm({ ...form, totalEpisodes: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="备注（可选）" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.title.trim()}>
            添加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
