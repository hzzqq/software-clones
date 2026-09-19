/**
 * 设置面板弹窗。
 *
 * 包含：主题（亮/暗/跟随系统）、字号缩放、全屏模式、减少动效、重置。
 * 所有变更即时生效并写入 localStorage。
 */
import { useCallback, useRef, useState } from 'react';
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
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
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
    appId,
  } = useSettingsHelp();
  const [resetTip, setResetTip] = useState<boolean>(false);
  const [importTip, setImportTip] = useState<{ severity: 'success' | 'error'; msg: string } | null>(
    null
  );
  const importRef = useRef<HTMLInputElement | null>(null);

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

  const handleExport = useCallback((): void => {
    try {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appId}-settings.json`;
      a.click();
      URL.revokeObjectURL(url);
      setImportTip({ severity: 'success', msg: '设置已导出' });
    } catch {
      setImportTip({ severity: 'error', msg: '导出失败' });
    }
  }, [settings, appId]);

  const handleImportFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (): void => {
        try {
          const parsed = JSON.parse(String(reader.result)) as Partial<{
            themeMode: unknown;
            fontScale: unknown;
            reduceMotion: unknown;
            extras: unknown;
          }>;
          const themeMode = parsed.themeMode;
          const fontScale = Number(parsed.fontScale);
          const reduceMotion = Boolean(parsed.reduceMotion);
          if (
            themeMode !== 'light' &&
            themeMode !== 'dark' &&
            themeMode !== 'system' &&
            !(
              typeof themeMode === 'string' &&
              ['light', 'dark', 'system'].includes(themeMode)
            )
          ) {
            throw new Error('themeMode 非法');
          }
          if (!Number.isFinite(fontScale)) {
            throw new Error('fontScale 非法');
          }
          update('themeMode', themeMode as 'light' | 'dark' | 'system');
          update(
            'fontScale',
            Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, fontScale))
          );
          update('reduceMotion', reduceMotion);
          if (parsed.extras && typeof parsed.extras === 'object') {
            update('extras', parsed.extras as Record<string, unknown>);
          }
          setImportTip({ severity: 'success', msg: '设置已导入' });
        } catch {
          setImportTip({ severity: 'error', msg: '导入失败：文件格式不正确' });
        }
      };
      reader.readAsText(file);
    },
    [update]
  );

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
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button color="inherit" startIcon={<RestartAltIcon />} onClick={handleReset}>
              重置
            </Button>
            <Button color="inherit" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport}>
              导出
            </Button>
            <Button
              color="inherit"
              component="label"
              startIcon={<FileUploadOutlinedIcon />}
            >
              导入
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={handleImportFile}
              />
            </Button>
          </Stack>
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

      <Snackbar
        open={importTip !== null}
        autoHideDuration={2400}
        onClose={() => setImportTip(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={importTip?.severity ?? 'info'}
          variant="filled"
          onClose={() => setImportTip(null)}
        >
          {importTip?.msg ?? ''}
        </Alert>
      </Snackbar>
    </>
  );
}

export default SettingsModal;
