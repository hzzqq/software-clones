import { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Habit } from '../types';
import { computeDailyStreak, computeWeeklyStreak, completedWeeks } from '../utils/streak';
import { monthCompletion } from '../utils/completion';
import { isoWeekKey } from '../utils/date';
import LevelProgress from './LevelProgress';

export interface HabitCardProps {
  habit: Habit;
  today: string;
  onOpen: (habit: Habit) => void;
  onToggleToday: (habit: Habit) => Promise<void>;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  busy: boolean;
}

export default function HabitCard({
  habit,
  today,
  onOpen,
  onToggleToday,
  onEdit,
  onDelete,
  busy,
}: HabitCardProps): JSX.Element {
  const [toggling, setToggling] = useState<boolean>(false);

  const checkedSet = new Set(habit.checkins);
  const checkedToday = checkedSet.has(today);

  const streak =
    habit.frequencyType === 'daily'
      ? computeDailyStreak(checkedSet, today)
      : computeWeeklyStreak(completedWeeks(checkedSet, habit.targetCount), isoWeekKey(today));

  const now = new Date();
  const completion = monthCompletion(checkedSet, now.getFullYear(), now.getMonth(), today);

  const handleToggle = async (): Promise<void> => {
    if (busy) return;
    setToggling(true);
    try {
      await onToggleToday(habit);
    } finally {
      setToggling(false);
    }
  };

  const freqLabel =
    habit.frequencyType === 'daily'
      ? `每日 ${habit.targetCount} 次`
      : `每周 ${habit.targetCount} 次`;

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea onClick={() => onOpen(habit)} sx={{ flexGrow: 1 }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
              }}
            >
              <span role="img" aria-label={habit.name}>
                {habit.icon || '✅'}
              </span>
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                {habit.name}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                <Chip label={freqLabel} size="small" variant="outlined" sx={{ height: 20, fontSize: 12 }} />
                <Chip
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: 14 }} />}
                  label={`${streak}`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ height: 20, fontSize: 12 }}
                />
              </Stack>
            </Box>
          </Stack>

          <Box sx={{ mt: 1.5 }}>
            <LevelProgress checkinCount={habit.totalCheckins} showXp={false} />
          </Box>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              本月 {completion.completed}/{completion.total} · {completion.percent}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              累计 {habit.totalCheckins} 次
            </Typography>
          </Stack>
        </CardContent>
      </CardActionArea>

      <Stack direction="row" alignItems="center" sx={{ px: 1.5, pb: 1 }}>
        <Tooltip title={checkedToday ? '取消今日打卡' : '今日打卡'}>
          <IconButton
            size="small"
            color={checkedToday ? 'success' : 'default'}
            onClick={() => void handleToggle()}
            disabled={toggling || busy}
            aria-label={checkedToday ? '取消今日打卡' : '今日打卡'}
          >
            {checkedToday ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
          </IconButton>
        </Tooltip>
        <Typography variant="caption" color={checkedToday ? 'success.main' : 'text.secondary'} sx={{ ml: 0.5 }}>
          {checkedToday ? '今天已打卡' : '今天未打卡'}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="编辑">
          <IconButton size="small" onClick={() => onEdit(habit)} aria-label="编辑习惯">
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="删除">
          <IconButton size="small" color="error" onClick={() => onDelete(habit)} aria-label="删除习惯">
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Card>
  );
}
