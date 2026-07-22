import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Grid, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlayerBar from '../components/PlayerBar';
import StationCard from '../components/StationCard';
import CategoryFilter from '../components/CategoryFilter';
import { Station } from '../types';
import { stationApi } from '../api/stations';

export default function RadioPage(): JSX.Element {
  const [stations, setStations] = useState<Station[]>([]);
  const [featured, setFeatured] = useState<Station | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', streamUrl: '', description: '', category: 'lofi' });

  const load = () => {
    setLoading(true);
    Promise.all([stationApi.list(category), stationApi.featured()])
      .then(([list, feat]) => {
        setStations(list);
        setFeatured(feat);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [category]);

  const categories = useMemo(() => Array.from(new Set(stations.map((s) => s.category))), [stations]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return stations;
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        (s.description ?? '').toLowerCase().includes(needle),
    );
  }, [stations, q]);

  const handlePlay = (s: Station) => {
    if (selected?.id === s.id) setPlaying((p) => !p);
    else {
      setSelected(s);
      setPlaying(true);
    }
  };
  const handleLike = (s: Station) => {
    stationApi.like(s.id).then((updated) => {
      setStations((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
      if (featured?.id === s.id) setFeatured(updated);
      if (selected?.id === s.id) setSelected(updated);
    });
  };
  const handleAdd = async () => {
    if (!form.name.trim() || !form.streamUrl.trim()) return;
    await stationApi.create({
      name: form.name.trim(),
      streamUrl: form.streamUrl.trim(),
      description: form.description,
      category: form.category,
    });
    setForm({ name: '', streamUrl: '', description: '', category: 'lofi' });
    setShowAdd(false);
    await load();
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={700}>
          Lo-fi 电台
        </Typography>
        <Button startIcon={<AddIcon />} variant="outlined" onClick={() => setShowAdd((v) => !v)}>
          新增电台
        </Button>
      </Stack>

      <TextField
        fullWidth
        size="small"
        placeholder="搜索电台名称或描述…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mt: 2 }}
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

      {featured && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 3,
            color: '#fff',
            background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
          }}
        >
          <Typography variant="caption">正在推荐</Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {featured.name}
              </Typography>
              <Typography variant="body2">{featured.description}</Typography>
            </Box>
            <Button
              variant="contained"
              color="inherit"
              startIcon={<PlayArrowIcon />}
              onClick={() => handlePlay(featured)}
              sx={{ color: '#1d4ed8' }}
            >
              播放
            </Button>
          </Stack>
        </Box>
      )}

      {showAdd && (
        <Stack spacing={1} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <TextField
            label="名称"
            size="small"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="流地址 (stream url)"
            size="small"
            value={form.streamUrl}
            onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
          />
          <TextField
            label="分类"
            size="small"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <TextField
            label="描述"
            size="small"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleAdd}>
              保存
            </Button>
            <Button onClick={() => setShowAdd(false)}>取消</Button>
          </Stack>
        </Stack>
      )}

      <CategoryFilter categories={categories} active={category} onSelect={setCategory} />

      {loading ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          加载中…
        </Typography>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {q ? `没有匹配“${q}”的电台` : '该分类下还没有电台，点击右上角新增一个吧。'}
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {filtered.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <StationCard station={s} active={selected?.id === s.id} onPlay={handlePlay} />
            </Grid>
          ))}
        </Grid>
      )}

      <PlayerBar
        station={selected}
        playing={playing}
        volume={volume}
        onToggle={() => setPlaying((p) => !p)}
        onVolume={setVolume}
        onLike={handleLike}
      />
    </Box>
  );
}
