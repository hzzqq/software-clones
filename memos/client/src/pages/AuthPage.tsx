import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { authApi } from '../api/auth';
import { authStore } from '../authStore';

/**
 * 登录 / 注册页。成功后写入本地会话并跳回首页。
 */
export default function AuthPage(): JSX.Element {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'register'
          ? await authApi.register(email, displayName, password)
          : await authApi.login(email, password);
      authStore.setSession(result.token, result.user);
      navigate('/', { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '操作失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          轻笔记 · 账户
        </Typography>
        <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
          <Tab value="login" label="登录" />
          <Tab value="register" label="注册" />
        </Tabs>
        <Stack spacing={2}>
          <TextField
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
          />
          {mode === 'register' && (
            <TextField
              label="显示名称"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              size="small"
            />
          )}
          <TextField
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button variant="contained" onClick={submit} disabled={busy}>
            {mode === 'register' ? '注册并登录' : '登录'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}{' '}
            <Link
              component="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  );
}
