import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Station } from '../types';
import Visualizer from './Visualizer';
import { categoryLabel, formatClock } from '../utils/station';

interface Props {
  station: Station | null;
  playing: boolean;
  volume: number;
  onToggle: () => void;
  onVolume: (v: number) => void;
  onLike: (s: Station) => void;
}

export default function PlayerBar({
  station,
  playing,
  volume,
  onToggle,
  onVolume,
  onLike,
}: Props): JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [errored, setErrored] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Reload the stream source only when the station actually changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !station) return;
    setErrored(false);
    a.src = station.streamUrl;
    a.load();
  }, [station]);

  // 切换电台时重置收听计时；播放中每秒自增（直播流 currentTime 多为 0，故手动计时更可靠）。
  useEffect(() => {
    setElapsed(0);
  }, [station]);
  useEffect(() => {
    if (!playing || !station) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [playing, station]);

  // Play / pause independently so toggling does not restart the stream.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !station) return;
    if (playing) a.play().catch(() => setErrored(true));
    else a.pause();
  }, [playing, station]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        px: 2,
        py: 1.5,
      }}
    >
      <audio ref={audioRef} onError={() => setErrored(true)} />
      <Stack direction="row" spacing={2} alignItems="center">
        <Visualizer playing={playing && !!station} />
        <Box sx={{ minWidth: 160, flexGrow: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {station ? station.name : '未选择电台'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {errored
              ? '播放失败，请检查电台流地址'
              : station
              ? `${categoryLabel(station.category)} · 已播放 ${formatClock(elapsed)}`
              : '从列表中选择一个电台开始播放'}
          </Typography>
        </Box>
        <IconButton color="primary" onClick={onToggle} disabled={!station}>
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton color="error" onClick={() => station && onLike(station)} disabled={!station}>
            <FavoriteIcon />
          </IconButton>
          <Typography variant="body2">{station ? station.likes : 0}</Typography>
        </Stack>
        <Box sx={{ width: 140, display: 'flex', alignItems: 'center' }}>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(_, v) => onVolume(v as number)}
            aria-label="音量"
          />
        </Box>
      </Stack>
    </Box>
  );
}
