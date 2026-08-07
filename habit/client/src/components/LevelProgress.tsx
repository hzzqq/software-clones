import { LinearProgress, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { progressToNextLevel, totalXp } from '../utils/xp';

export interface LevelProgressProps {
  /** 打卡次数。 */
  checkinCount: number;
  /** 是否显示 XP 数字。 */
  showXp?: boolean;
}

/** 等级 + XP 进度条（游戏化）。 */
export default function LevelProgress({ checkinCount, showXp = true }: LevelProgressProps): JSX.Element {
  const xp = totalXp(checkinCount);
  const progress = progressToNextLevel(xp);
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <EmojiEventsIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Lv.{progress.level}
        </Typography>
        {showXp && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {xp} XP · 距 Lv.{progress.level + 1} 还需 {progress.needed - xp} XP
          </Typography>
        )}
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress.percent}
        color="secondary"
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Stack>
  );
}
