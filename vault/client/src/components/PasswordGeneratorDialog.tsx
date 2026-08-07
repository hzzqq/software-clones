import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { PasswordOptions } from '../utils/passwordGenerator';
import {
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_LENGTH_MAX,
  PASSWORD_LENGTH_MIN,
  generatePassword,
} from '../utils/passwordGenerator';
import { copyText } from '../utils/clipboard';

export interface PasswordGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  /** 用户确认使用某个密码时回调。 */
  onUse: (password: string) => void;
}

export default function PasswordGeneratorDialog({
  open,
  onClose,
  onUse,
}: PasswordGeneratorDialogProps): JSX.Element {
  const [options, setOptions] = useState<PasswordOptions>({ ...DEFAULT_PASSWORD_OPTIONS });
  const [password, setPassword] = useState<string>(() => generatePassword(DEFAULT_PASSWORD_OPTIONS));
  const [copied, setCopied] = useState<boolean>(false);

  // 每次打开/参数变化时重新生成一次（保持可控：用户点刷新才换新）。
  const regenerate = (): void => {
    try {
      setPassword(generatePassword(options));
      setCopied(false);
    } catch {
      /* 参数非法时保留旧密码 */
    }
  };

  const update = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]): void => {
    const next = { ...options, [key]: value };
    setOptions(next);
    try {
      setPassword(generatePassword(next));
      setCopied(false);
    } catch {
      /* 暂不更新 */
    }
  };

  const strength = useMemo((): { label: string; color: string; width: string } => {
    let score = 0;
    if (options.length >= 12) score += 1;
    if (options.length >= 20) score += 1;
    if (options.uppercase && options.lowercase) score += 1;
    if (options.digits) score += 1;
    if (options.symbols) score += 1;
    const labels = ['很弱', '较弱', '一般', '较强', '强', '极强'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981'];
    const idx = Math.min(labels.length - 1, score);
    return { label: labels[idx], color: colors[idx], width: `${((idx + 1) / labels.length) * 100}%` };
  }, [options]);

  const handleCopy = async (): Promise<void> => {
    const ok = await copyText(password);
    setCopied(ok);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>随机密码生成器</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                size="small"
                InputProps={{ readOnly: true }}
                sx={{ fontFamily: 'monospace' }}
              />
              <Tooltip title="复制密码">
                <IconButton aria-label="复制密码" onClick={handleCopy}>
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="重新生成">
                <IconButton aria-label="重新生成" onClick={regenerate}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
              <Box width="100%">
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'grey.300',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ width: strength.width, height: '100%', bgcolor: strength.color }} />
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: strength.color, fontWeight: 700, minWidth: 34 }}>
                {strength.label}
              </Typography>
            </Stack>
            {copied && (
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                已复制到剪贴板
              </Typography>
            )}
          </Paper>

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ minWidth: 60 }}>
              长度：{options.length}
            </Typography>
            <Slider
              value={options.length}
              min={PASSWORD_LENGTH_MIN}
              max={PASSWORD_LENGTH_MAX}
              onChange={(_e, v) => update('length', v as number)}
              valueLabelDisplay="auto"
              sx={{ flexGrow: 1 }}
            />
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.uppercase}
                  onChange={(e) => update('uppercase', e.target.checked)}
                />
              }
              label="大写 A-Z"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.lowercase}
                  onChange={(e) => update('lowercase', e.target.checked)}
                />
              }
              label="小写 a-z"
            />
            <FormControlLabel
              control={
                <Checkbox checked={options.digits} onChange={(e) => update('digits', e.target.checked)} />
              }
              label="数字 0-9"
            />
            <FormControlLabel
              control={
                <Checkbox checked={options.symbols} onChange={(e) => update('symbols', e.target.checked)} />
              }
              label="符号 !@#"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.excludeAmbiguous}
                  onChange={(e) => update('excludeAmbiguous', e.target.checked)}
                />
              }
              label="排除易混淆字符"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={() => onUse(password)} disabled={!password}>
          使用此密码
        </Button>
      </DialogActions>
    </Dialog>
  );
}
