import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box, Typography, Stack, Button, LinearProgress, Chip, CircularProgress, Alert, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { showApi } from '../api/shows';
import { episodeApi } from '../api/episodes';
import type { Show, Episode } from '../types';
import EpisodeGrid from '../components/EpisodeGrid';
import { progressPercent, nextEpisode, isComplete, episodesLeft, remainingWatchTime, formatWatchTime, formatEpisodeCode, nextEpisodeLabel, filterEpisodesByWatched, episodesByStatus, formatProgress, lastWatchedAt, seasonsOf, type EpisodeFilter } from '../utils/show';
import { formatRelativeTime } from '../utils/time';

export default function ShowDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const showId = Number(id);
  const validId = Number.isInteger(showId) && showId > 0;
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epFilter, setEpFilter] = useState<EpisodeFilter>('all');
  const [seasonFilter, setSeasonFilter] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!validId) {
      setShow(null);
      setEpisodes([]);
      setError('无效的剧集 ID');
      setLoading(false);
      return;
    }
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
    const next = nextEpisode(episodes);
    if (next == null) return;
    if (!next.watched) await toggle(next.id);
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
  const seasons = useMemo(() => seasonsOf(episodes), [episodes]);
  const visibleEps = filterEpisodesByWatched(
    seasonFilter === 'all' ? episodes : episodes.filter((e) => (e.season ?? 1) === seasonFilter),
    epFilter,
  );
  const epStatus = episodesByStatus(episodes);
  const nextEp = nextEpisode(episodes);
  const lastWatched = lastWatchedAt(episodes);
  const lastWatchedLabel = lastWatched ? formatRelativeTime(lastWatched) : null;

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
      <Typography variant="caption" color="text.secondary">{formatProgress(show)}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Chip size="small" label={`${show.watchedCount}/${show.totalEpisodes}`} />
        <Chip size="small" label={`${pct}%`} color={isComplete(show.watchedCount, show.totalEpisodes) ? 'success' : 'default'} />
        <Chip size="small" label={`剩 ${episodesLeft(show)} 集`} variant="outlined" />
        <Chip size="small" label={`已看 ${epStatus.watched} · 未看 ${epStatus.unwatched}`} variant="outlined" color="success" />
        {episodesLeft(show) > 0 && (
          <Chip size="small" variant="outlined" color="info" label={`还需约 ${formatWatchTime(remainingWatchTime(show))}`} />
        )}
      </Stack>

      {!isComplete(show.watchedCount, show.totalEpisodes) && nextEp != null && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={<Chip size="small" color="info" label={nextEpisodeLabel(nextEp, show.totalEpisodes)} />}
        >
          接下来看：{formatEpisodeCode(nextEp.season ?? 1, nextEp.number ?? nextEp.index)}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<SkipNextIcon />} onClick={markNext} disabled={nextEp == null}>
          标记下一集
        </Button>
        <Button variant="outlined" startIcon={<DoneAllIcon />} onClick={markAll} disabled={show.watchedCount >= show.totalEpisodes}>
          全部标记已看
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {lastWatchedLabel ? `上次观看：${lastWatchedLabel}` : '尚未观看任何剧集'}
      </Typography>

      <Divider sx={{ mb: 2 }} />
      {seasons.length > 1 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">选择季：</Typography>
          <ToggleButtonGroup
            size="small"
            value={seasonFilter}
            exclusive
            onChange={(_e, v: number | 'all' | null) => v != null && setSeasonFilter(v)}
          >
            <ToggleButton value="all">全部</ToggleButton>
            {seasons.map((s) => (
              <ToggleButton key={s} value={s}>第 {s} 季</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">剧集筛选：</Typography>
        <ToggleButtonGroup
          size="small"
          value={epFilter}
          exclusive
          onChange={(_e, v: EpisodeFilter | null) => v && setEpFilter(v)}
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="watched">已看</ToggleButton>
          <ToggleButton value="unwatched">仅未看</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <EpisodeGrid episodes={visibleEps} onToggle={toggle} />
    </Box>
  );
}
