import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import type { CalendarCell } from '../utils/calendar';
import { buildMonthGrid, monthLabel, WEEKDAY_LABELS } from '../utils/calendar';

export interface CalendarGridProps {
  year: number;
  month: number;
  checkedDates: Set<string>;
  /** 点击某天：传 (dateKey, 是否已打卡)，由父组件决定打卡 / 取消。 */
  onToggleDate: (dateKey: string, checked: boolean) => void;
  /** 是否允许点击打卡（习惯已删除等场景可为 false）。 */
  interactive?: boolean;
}

/** 月历打卡网格：今天高亮、已打卡标记、点击切换。 */
export default function CalendarGrid({
  year,
  month,
  checkedDates,
  onToggleDate,
  interactive = true,
}: CalendarGridProps): JSX.Element {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const weeks = buildMonthGrid(year, month, todayKey, 0);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {monthLabel(year, month)}
      </Typography>
      <Stack direction="row" sx={{ mb: 0.5 }}>
        {WEEKDAY_LABELS.map((label) => (
          <Box key={label} sx={{ flex: 1, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Box>
        ))}
      </Stack>
      {weeks.map((week, wi) => (
        <Stack direction="row" key={`${year}-${month}-${wi}`} sx={{ mb: 0.5 }}>
          {week.map((cell) => (
            <CalendarDayCell
              key={cell.dateKey}
              cell={cell}
              checked={checkedDates.has(cell.dateKey)}
              interactive={interactive}
              onToggle={onToggleDate}
            />
          ))}
        </Stack>
      ))}
    </Paper>
  );
}

interface CellProps {
  cell: CalendarCell;
  checked: boolean;
  interactive: boolean;
  onToggle: (dateKey: string, checked: boolean) => void;
}

function CalendarDayCell({ cell, checked, interactive, onToggle }: CellProps): JSX.Element {
  const dim = !cell.inMonth;
  const handleClick = (): void => {
    if (!interactive) return;
    onToggle(cell.dateKey, checked);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: 0.25 }}>
      <Tooltip title={checked ? `${cell.dateKey} 已打卡` : `${cell.dateKey}`}>
        <Box
          onClick={handleClick}
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onKeyDown={(e) => {
            if (interactive && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              handleClick();
            }
          }}
          sx={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: interactive ? 'pointer' : 'default',
            userSelect: 'none',
            bgcolor: checked ? 'secondary.main' : 'transparent',
            color: checked ? '#fff' : dim ? 'text.disabled' : 'text.primary',
            opacity: dim && !checked ? 0.35 : 1,
            border: cell.isToday ? '2px solid' : '1px solid transparent',
            borderColor: cell.isToday ? 'primary.main' : 'transparent',
            fontWeight: cell.isToday ? 700 : 400,
            '&:hover': interactive
              ? { bgcolor: checked ? 'secondary.dark' : 'action.hover' }
              : undefined,
          }}
        >
          {checked ? <CheckIcon sx={{ fontSize: 18 }} /> : cell.dayOfMonth}
        </Box>
      </Tooltip>
    </Box>
  );
}
