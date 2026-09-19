/**
 * 右下角悬浮入口：齿轮（设置）+ 问号（使用说明）。
 *
 * 12 个 App 统一显示，不做特化，保证交互位置一致、肌肉记忆可迁移。
 */
import { Box, Fab, Tooltip } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useSettingsHelp } from './SettingsHelpProvider';

/** 悬浮操作按钮组。 */
export function SettingsHelpLauncher(): JSX.Element {
  const { openSettings, openHelp } = useSettingsHelp();

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: (theme) => theme.zIndex.speedDial,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        // 打印时隐藏悬浮入口。
        '@media print': { display: 'none' },
      }}
    >
      <Tooltip title="使用说明（F1）" placement="left">
        <Fab size="small" color="default" aria-label="使用说明" onClick={openHelp}>
          <HelpOutlineIcon />
        </Fab>
      </Tooltip>
      <Tooltip title="设置（Ctrl/Cmd + ,）" placement="left">
        <Fab size="medium" color="primary" aria-label="设置" onClick={openSettings}>
          <SettingsOutlinedIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
}

export default SettingsHelpLauncher;
