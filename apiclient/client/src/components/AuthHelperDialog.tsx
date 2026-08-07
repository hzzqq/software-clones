import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  EMPTY_AUTH,
  AUTH_TYPE_LABELS,
  buildAuthHeaders,
  buildAuthParams,
  isAuthComplete,
  type AuthConfig,
  type AuthType,
} from '../utils/auth';

export interface AuthHelperDialogProps {
  open: boolean;
  onClose: () => void;
  /** 应用鉴权：把生成的头 / 参数合并进当前草稿。 */
  onApply: (headers: Record<string, string>, params: Record<string, string>) => void;
}

/**
 * 鉴权助手：选择 Bearer / Basic / API Key 并填写字段，自动生成正确的请求头或查询参数。
 * Basic 的 Base64 编码由工具函数完成（UTF-8 安全），避免手工拼错。
 */
export default function AuthHelperDialog({
  open,
  onClose,
  onApply,
}: AuthHelperDialogProps): JSX.Element {
  const [cfg, setCfg] = useState<AuthConfig>(EMPTY_AUTH);

  const headers = useMemo(() => buildAuthHeaders(cfg), [cfg]);
  const params = useMemo(() => buildAuthParams(cfg), [cfg]);
  const complete = isAuthComplete(cfg);

  const patch = (p: Partial<AuthConfig>): void => setCfg((c) => ({ ...c, ...p }));

  const handleApply = (): void => {
    if (!complete) return;
    onApply(headers, params);
    onClose();
  };

  const previewLines: string[] = [
    ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    ...Object.entries(params).map(([k, v]) => `?${k}=${v}`),
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>鉴权助手</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <FormControl size="small" fullWidth>
            <InputLabel id="auth-type-label">鉴权方式</InputLabel>
            <Select
              labelId="auth-type-label"
              label="鉴权方式"
              value={cfg.type}
              onChange={(e) => patch({ type: e.target.value as AuthType })}
            >
              {(Object.keys(AUTH_TYPE_LABELS) as AuthType[]).map((t) => (
                <MenuItem key={t} value={t}>
                  {AUTH_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {cfg.type === 'bearer' && (
            <TextField
              size="small"
              label="Token（不含 Bearer 前缀）"
              value={cfg.token ?? ''}
              onChange={(e) => patch({ token: e.target.value })}
              fullWidth
            />
          )}

          {cfg.type === 'basic' && (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="用户名"
                value={cfg.username ?? ''}
                onChange={(e) => patch({ username: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="密码"
                type="password"
                value={cfg.password ?? ''}
                onChange={(e) => patch({ password: e.target.value })}
                fullWidth
              />
            </Stack>
          )}

          {cfg.type === 'apikey' && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="键名"
                  value={cfg.keyName ?? ''}
                  onChange={(e) => patch({ keyName: e.target.value })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="键值"
                  value={cfg.keyValue ?? ''}
                  onChange={(e) => patch({ keyValue: e.target.value })}
                  fullWidth
                />
              </Stack>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={cfg.addTo ?? 'header'}
                onChange={(_e, v) => {
                  if (v) patch({ addTo: v as 'header' | 'query' });
                }}
              >
                <ToggleButton value="header">放入请求头</ToggleButton>
                <ToggleButton value="query">放入查询参数</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          )}

          {cfg.type === 'none' ? (
            <Typography variant="body2" color="text.secondary">
              选择一种鉴权方式后，这里会显示将要写入的内容。
            </Typography>
          ) : complete ? (
            <Alert severity="info">
              <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                {previewLines.map((line) => (
                  <div key={line} style={{ wordBreak: 'break-all' }}>
                    {line}
                  </div>
                ))}
              </Typography>
            </Alert>
          ) : (
            <Alert severity="warning">请填写完整信息后再应用。</Alert>
          )}

          <Typography variant="caption" color="text.secondary">
            提示：值中同样支持 {'{{变量名}}'}，可结合环境变量避免把密钥写死在请求里。
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCfg(EMPTY_AUTH)}>重置</Button>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleApply} disabled={!complete}>
          应用到请求
        </Button>
      </DialogActions>
    </Dialog>
  );
}
