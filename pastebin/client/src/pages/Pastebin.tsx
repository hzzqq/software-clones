import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { pastebinApi, Paste } from '../api/pastebin';

export default function Pastebin(): JSX.Element {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('text');
  const [visibility, setVisibility] = useState('public');
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Paste | null>(null);

  const [viewCode, setViewCode] = useState('');
  const [viewed, setViewed] = useState<Paste | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const onSubmit = async (): Promise<void> => {
    if (!content.trim()) {
      setError('内容不能为空');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await pastebinApi.create({
        title: title || undefined,
        content,
        language,
        visibility,
        expiresInMinutes: expiresInMinutes === '' ? undefined : Number(expiresInMinutes),
      });
      setCreated(res);
      setContent('');
      setTitle('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onView = async (): Promise<void> => {
    if (!viewCode.trim()) return;
    setViewLoading(true);
    setViewError(null);
    try {
      const p = await pastebinApi.get(viewCode.trim());
      setViewed(p);
    } catch (e) {
      setViewed(null);
      setViewError(e instanceof Error ? e.message : '查询失败');
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" fontWeight={700}>
        文本 / 代码粘贴板
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          新建粘贴
        </Typography>
        <Stack spacing={2}>
          <TextField label="标题（可选）" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>语言</InputLabel>
              <Select label="语言" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <MenuItem value="text">Plain Text</MenuItem>
                <MenuItem value="js">JavaScript</MenuItem>
                <MenuItem value="ts">TypeScript</MenuItem>
                <MenuItem value="py">Python</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="sql">SQL</MenuItem>
                <MenuItem value="bash">Bash</MenuItem>
                <MenuItem value="html">HTML</MenuItem>
                <MenuItem value="css">CSS</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>可见性</InputLabel>
              <Select label="可见性" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <MenuItem value="public">公开</MenuItem>
                <MenuItem value="private">私有</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="过期（分钟，留空永不过期）"
              type="number"
              size="small"
              value={expiresInMinutes}
              onChange={(e) => setExpiresInMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 220 }}
            />
          </Box>
          <TextField
            label="内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            multiline
            minRows={6}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Box>
            <Button variant="contained" onClick={onSubmit} disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : '创建并生成短链'}
            </Button>
          </Box>
          {created && (
            <Alert severity="success">
              已创建，短链：<b>{created.code}</b>（{created.visibility === 'public' ? '公开' : '私有'}）
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          查看粘贴
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="短码"
            value={viewCode}
            onChange={(e) => setViewCode(e.target.value)}
            size="small"
          />
          <Button variant="outlined" onClick={onView} disabled={viewLoading}>
            查看
          </Button>
        </Stack>
        {viewError && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {viewError}
          </Alert>
        )}
        {viewed && (
          <Box sx={{ mt: 2 }}>
            <Typography fontWeight={600}>
              {viewed.title || '(无标题)'} · {viewed.language}
            </Typography>
            <Paper
              variant="outlined"
              sx={{ mt: 1, p: 2, bgcolor: 'rgba(0,0,0,0.25)', overflow: 'auto' }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {viewed.content}
              </pre>
            </Paper>
            <Typography variant="caption" color="text.secondary">
              创建于 {new Date(viewed.createdAt).toLocaleString()}
              {viewed.expiresAt ? ` · 过期于 ${new Date(viewed.expiresAt).toLocaleString()}` : ' · 永不过期'}
            </Typography>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
