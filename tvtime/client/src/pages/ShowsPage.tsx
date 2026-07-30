import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { showApi } from '../api/shows';
import type { Show } from '../types';
import ShowCard from '../components/ShowCard';
import { filterShows, sortShows, isComplete, clampEpisodeCount, summarizeLibrary, averageProgress, type ShowSort } from '../utils/show';

export default function ShowsPage(): JSX.Element {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<ShowSort>('updated');
  const [status, setStatus] = useState<'all' | 'watching' | 'done'>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', totalEpisodes: '12', note: '' });

  const visible = useMemo(() => {
    const byQuery = filterShows(q, shows);
    const byStatus = byQuery.filter((s) => {
      if (status === 'watching') return !isComplete(s.watchedCount, s.totalEpisodes);
      if (status === 'done') return isComplete(s.watchedCount, s.totalEpisodes);
      return true;
    });
    return sortShows(byStatus, sort);
  }, [shows, q, status, sort]);

  const summary = useMemo(() => summarizeLibrary(shows), [shows]);

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
        totalEpisodes: clampEpisodeCount(form.totalEpisodes),
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

      <Stack direction="row" spacing={1} sx={{ my: 2 }} alignItems="center" flexWrap="wrap">
        <ToggleButtonGroup
          size="small"
          value={status}
          exclusive
          onChange={(_e, v) => v && setStatus(v)}
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="watching">进行中</ToggleButton>
          <ToggleButton value="done">已完结</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flexGrow: 1 }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>排序</InputLabel>
          <Select
            label="排序"
            value={sort}
            onChange={(e) => setSort(e.target.value as ShowSort)}
          >
            <MenuItem value="updated">最近更新</MenuItem>
            <MenuItem value="progress">观看进度</MenuItem>
            <MenuItem value="title">名称</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {!loading && !error && shows.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ my: 2 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`共 ${summary.totalShows} 部`} />
          <Chip size="small" color="success" variant="outlined" label={`已完结 ${summary.completed}`} />
          <Chip size="small" color="info" variant="outlined" label={`进行中 ${summary.watching}`} />
          <Chip size="small" label={`已看 ${summary.watchedEpisodes} / ${summary.totalEpisodes} 集`} />
          <Chip size="small" color="primary" label={`总进度 ${summary.overallPercent}%`} />
          <Chip size="small" color="secondary" variant="outlined" label={`平均进度 ${averageProgress(shows)}%`} />
        </Stack>
      )}

      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {!loading && !error && shows.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          还没有追的剧，点「添加剧集」开始记录吧。
        </Typography>
      )}
      {!loading && !error && shows.length > 0 && visible.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', my: 4 }}>
          没有匹配“{q}”的剧集。
        </Typography>
      )}
      {!loading && visible.map((s) => <ShowCard key={s.id} show={s} onDelete={handleDelete} />)}

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
