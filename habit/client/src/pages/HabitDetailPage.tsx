import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useNavigate, useParams } from 'react-router-dom';
import type { Habit } from '../types';
import { habitsApi } from '../api/habits';
import CalendarGrid from '../components/CalendarGrid';
import LevelProgress from '../components/LevelProgress';
import { computeDailyStreak, computeWeeklyStreak, completedWeeks, longestDailyStreak } from '../utils/streak';
import { monthCompletion } from '../utils/completion';
import { isoWeekKey, todayKey } from '../utils/date';

export default function HabitDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const habitId = Number(id);

  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const now = new Date();
  const [view, setView] = useState<{ year: number; month: number }>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const load = useCallback(async (): Promise<void> => {
    if (!Number.isFinite(habitId) || habitId <= 0) {
      setError('无效的习惯 ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setHabit(await habitsApi.get(habitId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayKey();
  const checkedSet = useMemo(() => new Set(habit?.checkins ?? []), [habit]);

  const stats = useMemo(() => {
    if (!habit) return null;
    const dailyStreak =
      habit.frequencyType === 'daily'
        ? computeDailyStreak(checkedSet, today)
        : computeWeeklyStreak(completedWeeks(checkedSet, habit.targetCount), isoWeekKey(today));
    const longest =
      habit.frequencyType === 'daily' ? longestDailyStreak(checkedSet) : completedWeeks(checkedSet, habit.targetCount).size;
    const completion = monthCompletion(checkedSet, view.year, view.month, today);
    return { dailyStreak, longest, completion };
  }, [habit, checkedSet, today, view]);

  const shiftMonth = (delta: number): void => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goCurrentMonth = (): void => {
    setView({ year: now.getFullYear(), month: now.getMonth() });
  };

  const handleToggleDate = async (dateKey: string, checked: boolean): Promise<void> => {
    if (!habit || busy) return;
    setBusy(true);
    setError('');
    try {
      if (checked) {
        await habitsApi.cancelCheckIn(habit.id, dateKey);
        setNotice(`${dateKey} 已取消打卡`);
      } else {
        await habitsApi.checkIn(habit.id, dateKey);
        setNotice(`${dateKey} 打卡成功 +10 XP`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !habit) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || '习惯不存在'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          返回列表
        </Button>
      </Box>
    );
  }

  const freqLabel =
    habit.frequencyType === 'daily' ? `每日 ${habit.targetCount} 次` : `每周 ${habit.targetCount} 次`;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
        返回列表
      </Button>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              bgcolor: 'primary.light',
            }}
          >
            <span role="img" aria-label={habit.name}>
              {habit.icon || '✅'}
            </span>
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 200 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {habit.name}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
              <Chip label={freqLabel} size="small" variant="outlined" />
              <Chip
                icon={<LocalFireDepartmentIcon sx={{ fontSize: 14 }} />}
                label={`连续 ${stats?.dailyStreak ?? 0}`}
                size="small"
                color="error"
                variant="outlined"
              />
            </Stack>
          </Box>
          <Box sx={{ width: 260, maxWidth: '100%' }}>
            <LevelProgress checkinCount={habit.totalCheckins} />
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <CalendarGrid
            year={view.year}
            month={view.month}
            checkedDates={checkedSet}
            onToggleDate={(dateKey, checked) => void handleToggleDate(dateKey, checked)}
          />
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
            <IconButton size="small" onClick={() => shiftMonth(-1)} aria-label="上个月">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton size="small" onClick={() => shiftMonth(1)} aria-label="下个月">
              <ChevronRightIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" variant="outlined" onClick={goCurrentMonth}>
              回到本月
            </Button>
          </Stack>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              统计
            </Typography>
            <StatRow label="连续打卡" value={stats ? `${stats.dailyStreak} 天` : '—'} />
            <StatRow label="最长连续" value={stats ? `${stats.longest} 天` : '—'} />
            <StatRow label="累计打卡" value={`${habit.totalCheckins} 次`} />
            <StatRow
              label="本月完成度"
              value={stats ? `${stats.completion.completed}/${stats.completion.total} · ${stats.completion.percent}%` : '—'}
            />
            <StatRow label="频率目标" value={freqLabel} />
            <StatRow label="创建时间" value={new Date(habit.createdAt).toLocaleDateString('zh-CN')} />
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
}

function StatRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: '1px dashed', borderColor: 'divider' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}
