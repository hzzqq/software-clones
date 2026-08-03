/**
 * 设置面板弹窗。
 *
 * 包含：主题（亮/暗/跟随系统）、字号缩放、全屏模式、减少动效、重置。
 * 所有变更即时生效并写入 localStorage。
 */
import { useCallback, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Slider,
  Snackbar,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import type { ThemeMode } from './types';
import {
  FONT_SCALE_MIN,
  FONT_SCALE_MAX,
  FONT_SCALE_STEP,
  FONT_SCALE_DEFAULT,
} from './constants';
import { useModalPresence } from './hooks/useModalBroadcast';
import { useSettingsHelp } from './SettingsHelpProvider';

/** 字号滑块的刻度。 */
const FONT_SCALE_MARKS = [
  { value: 0.85, label: '85%' },
  { value: 1, label: '100%' },
  { value: 1.15, label: '115%' },
  { value: 1.3, label: '130%' },
];

/** 把缩放系数格式化成百分比文案。 */
function formatScale(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** 设置面板。 */
export function SettingsModal(): JSX.Element {
  const {
    settings,
    update,
    reset,
    isFullscreen,
    toggleFullscreen,
    settingsOpen,
    closeSettings,
    appName,
  } = useSettingsHelp();
  const [resetTip, setResetTip] = useState<boolean>(false);

  useModalPresence(settingsOpen, 'settings');

  const handleThemeChange = useCallback(
    (_event: MouseEvent<HTMLElement>, value: ThemeMode | null): void => {
      if (value !== null) {
        update('themeMode', value);
      }
    },
    [update]
  );

  const handleFontScaleChange = useCallback(
    (_event: Event, value: number | number[]): void => {
      const next: number = Array.isArray(value) ? (value[0] ?? FONT_SCALE_DEFAULT) : value;
      update('fontScale', next);
    },
    [update]
  );

  const handleFullscreenChange = useCallback((): void => {
    void toggleFullscreen();
  }, [toggleFullscreen]);

  const handleReduceMotionChange = useCallback(
    (_event: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
      update('reduceMotion', checked);
    },
    [update]
  );

  const handleReset = useCallback((): void => {
    reset();
    setResetTip(true);
  }, [reset]);

  return (
    <>
      <Dialog open={settingsOpen} onClose={closeSettings} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          设置
          <Typography variant="body2" color="text.secondary">
            {appName}
          </Typography>
          <IconButton
            aria-label="关闭设置"
            onClick={closeSettings}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                主题
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={settings.themeMode}
                onChange={handleThemeChange}
                aria-label="主题模式"
              >
                <ToggleButton value="light" aria-label="亮色">
                  <LightModeOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                  亮色
                </ToggleButton>
                <ToggleButton value="dark" aria-label="暗色">
                  <DarkModeOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                  暗色
                </ToggleButton>
                <ToggleButton value="system" aria-label="跟随系统">
                  <SettingsBrightnessIcon fontSize="small" sx={{ mr: 0.5 }} />
                  跟随系统
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider flexItem />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="subtitle2" gutterBottom>
                  字号缩放
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatScale(settings.fontScale)}
                </Typography>
              </Stack>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={settings.fontScale}
                  min={FONT_SCALE_MIN}
                  max={FONT_SCALE_MAX}
                  step={FONT_SCALE_STEP}
                  marks={FONT_SCALE_MARKS}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatScale}
                  onChange={handleFontScaleChange}
                  aria-label="字号缩放"
                />
              </Box>
            </Box>

            <Divider flexItem />

            <FormControlLabel
              control={<Switch checked={isFullscreen} onChange={handleFullscreenChange} />}
              label={
                <Box>
                  <Typography variant="body2">全屏模式</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isFullscreen ? '已进入全屏，再次点击退出' : '当前为窗口模式'}
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch checked={settings.reduceMotion} onChange={handleReduceMotionChange} />
              }
              label={
                <Box>
                  <Typography variant="body2">减少动效</Typography>
                  <Typography variant="caption" color="text.secondary">
                    降低过渡与动画时长，缓解眩晕
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button color="inherit" startIcon={<RestartAltIcon />} onClick={handleReset}>
            重置
          </Button>
          <Button variant="contained" onClick={closeSettings}>
            完成
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={resetTip}
        autoHideDuration={2400}
        onClose={() => setResetTip(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setResetTip(false)}>
          已恢复默认设置
        </Alert>
      </Snackbar>
    </>
  );
}

export default SettingsModal;
