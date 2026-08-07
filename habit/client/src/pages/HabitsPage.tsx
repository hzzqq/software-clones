import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import type { Habit, HabitInput } from '../types';
import { habitsApi } from '../api/habits';
import HabitCard from '../components/HabitCard';
import HabitDialog from '../components/HabitDialog';
import { todayKey } from '../utils/date';
import { totalXp } from '../utils/xp';

export default function HabitsPage(): JSX.Element {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      setHabits(await habitsApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayKey();

  const summary = useMemo(() => {
    const total = habits.length;
    const todayChecked = habits.filter((h) => h.checkins.includes(today)).length;
    const totalCheckins = habits.reduce((sum, h) => sum + h.totalCheckins, 0);
    const xp = totalXp(totalCheckins);
    return { total, todayChecked, totalCheckins, xp };
  }, [habits, today]);

  const handleSubmit = async (input: HabitInput): Promise<void> => {
    if (editing) {
      await habitsApi.update(editing.id, input);
      setNotice('习惯已更新');
    } else {
      await habitsApi.create(input);
      setNotice('习惯已创建');
    }
    await load();
  };

  const handleToggleToday = async (habit: Habit): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      if (habit.checkins.includes(today)) {
        await habitsApi.cancelCheckIn(habit.id, today);
        setNotice(`已取消「${habit.name}」今日打卡`);
      } else {
        await habitsApi.checkIn(habit.id, today);
        setNotice(`「${habit.name}」打卡成功 +10 XP`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await habitsApi.remove(deleteTarget.id);
      setNotice('习惯已删除');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            我的习惯
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary.total} 个习惯 · 今日完成 {summary.todayChecked} · 累计打卡 {summary.totalCheckins} 次 ·
            共 {summary.xp} XP
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          新建习惯
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : habits.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            还没有习惯，先建一个吧
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            创建第一个习惯
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {habits.map((habit) => (
            <Grid item xs={12} sm={6} md={4} key={habit.id}>
              <HabitCard
                habit={habit}
                today={today}
                onOpen={(h) => navigate(`/habits/${h.id}`)}
                onToggleToday={handleToggleToday}
                onEdit={(h) => {
                  setEditing(h);
                  setDialogOpen(true);
                }}
                onDelete={setDeleteTarget}
                busy={busy}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <HabitDialog
        open={dialogOpen}
        habit={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice('')}
        message={notice}
      />

      {/* 删除确认 */}
      <Snackbar
        open={Boolean(deleteTarget)}
        autoHideDuration={null}
        message={deleteTarget ? `确定删除「${deleteTarget.name}」？其全部打卡记录将一并删除。` : ''}
        action={
          <Stack direction="row" spacing={1}>
            <Button color="inherit" size="small" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button color="error" size="small" onClick={() => void confirmDelete()}>
              删除
            </Button>
          </Stack>
        }
      />
    </Box>
  );
}
