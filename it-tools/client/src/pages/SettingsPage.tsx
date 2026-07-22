import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { settingsApi } from '../api/settings';

type ThemeMode = 'light' | 'dark';

/** Simple settings page backed by the `/api/settings` key-value store. */
export default function SettingsPage(): JSX.Element {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [backendOk, setBackendOk] = useState<boolean>(true);

  useEffect(() => {
    void settingsApi
      .getAll()
      .then((data) => {
        setBackendOk(true);
        if (data.theme === 'dark' || data.theme === 'light') {
          setTheme(data.theme);
        }
      })
      .catch(() => setBackendOk(false));
  }, []);

  const save = (next: ThemeMode): void => {
    setTheme(next);
    setStatus('idle');
    void settingsApi
      .set('theme', next)
      .then(() => setStatus('saved'))
      .catch(() => setStatus('error'));
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        设置
      </Typography>
      {!backendOk && (
        <Alert severity="info" sx={{ mb: 2 }}>
          后端未连接，设置将不会被持久化（仅本地展示）。
        </Alert>
      )}
      <Stack spacing={2} sx={{ maxWidth: 360 }}>
        <FormControl fullWidth>
          <InputLabel>主题</InputLabel>
          <Select
            label="主题"
            value={theme}
            onChange={(e) => save(e.target.value as ThemeMode)}
          >
            <MenuItem value="light">浅色</MenuItem>
            <MenuItem value="dark">深色</MenuItem>
          </Select>
        </FormControl>
        {status === 'saved' && <Alert severity="success">已保存。</Alert>}
        {status === 'error' && <Alert severity="error">保存失败，请确认后端已启动。</Alert>}
        <Box>
          <Button variant="text" onClick={() => window.location.reload()}>
            应用主题（刷新）
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
