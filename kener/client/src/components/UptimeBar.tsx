import { Box } from '@mui/material';
import type { CheckPoint } from '../types';

/**
 * Renders a day-bucketed uptime timeline (one cell per day). Green = up,
 * red = down, grey = no probe data for that day.
 */
export default function UptimeBar({ checks, days = 90 }: { checks: CheckPoint[]; days?: number }) {
  const cells = Array.from({ length: days }, (_, i) => {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - (days - 1 - i));
    const key = dayStart.toISOString().slice(0, 10);
    const hit = checks.find((c) => c.checkedAt.slice(0, 10) === key);
    return hit ? (hit.ok ? 'up' : 'down') : 'none';
  });

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
      {cells.map((c, i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: 0.5,
            bgcolor: c === 'up' ? 'success.main' : c === 'down' ? 'error.main' : 'grey.300',
          }}
          title={c}
        />
      ))}
    </Box>
  );
}
