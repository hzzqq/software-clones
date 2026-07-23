import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, LinearProgress, Chip, CircularProgress, Alert, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { showApi } from '../api/shows';
import { episodeApi } from '../api/episodes';
import type { Show, Episode } from '../types';
import EpisodeGrid from '../components/EpisodeGrid';
import { progressPercent, nextUnwatched, isComplete, episodesLeft, remainingWatchTime, formatWatchTime } from '../utils/show';

export default function ShowDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const showId = Number(id);
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, eps] = await Promise.all([showApi.get(showId), showApi.episodes(showId)]);
      setShow(s);
      setEpisodes(eps);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  const toggle = async (epId: number) => {
    try {
      const updated = await episodeApi.toggle(epId);
      setEpisodes((prev) => prev.map((e) => (e.id === epId ? updated : e)));
      // 刷新剧集进度
      const s = await showApi.get(showId);
      setShow(s);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const markNext = async () => {
    const next = nextUnwatched(episodes);
    if (next == null) return;
    const target = episodes.find((e) => e.index === next);
    if (target && !target.watched) await toggle(target.id);
  };

  const markAll = async () => {
    try {
      await Promise.all(episodes.filter((e) => !e.watched).map((e) => episodeApi.setWatched(e.id, true)));
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!show) return <Alert severity="warning">剧集不存在</Alert>;

  const pct = progressPercent(show.watchedCount, show.totalEpisodes);

  return (
    <Box>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, color: 'text.secondary' }}>
          <ArrowBackIcon fontSize="small" />
          <Typography variant="caption">返回列表</Typography>
        </Stack>
      </Link>

      <Typography variant="h5">{show.title}</Typography>
      {show.note && <Typography variant="body2" color="text.secondary">{show.note}</Typography>}
      <LinearProgress variant="determinate" value={pct} sx={{ my: 1, height: 8, borderRadius: 4 }} />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Chip size="small" label={`${show.watchedCount}/${show.totalEpisodes}`} />
        <Chip size="small" label={`${pct}%`} color={isComplete(show.watchedCount, show.totalEpisodes) ? 'success' : 'default'} />
        <Chip size="small" label={`剩 ${episodesLeft(show)} 集`} variant="outlined" />
        {episodesLeft(show) > 0 && (
          <Chip size="small" variant="outlined" color="info" label={`还需约 ${formatWatchTime(remainingWatchTime(show))}`} />
        )}
      </Stack>

      {!isComplete(show.watchedCount, show.totalEpisodes) && nextUnwatched(episodes) != null && (
        <Alert severity="info" sx={{ mb: 2 }}>
          接下来看：第 {nextUnwatched(episodes)} 集
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<SkipNextIcon />} onClick={markNext} disabled={nextUnwatched(episodes) == null}>
          标记下一集
        </Button>
        <Button variant="outlined" startIcon={<DoneAllIcon />} onClick={markAll} disabled={show.watchedCount >= show.totalEpisodes}>
          全部标记已看
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />
      <EpisodeGrid episodes={episodes} onToggle={toggle} />
    </Box>
  );
}
