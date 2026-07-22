import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';

const FIELDS: Array<{ key: string; label: string; range: string }> = [
  { key: 'minute', label: '分钟', range: '0-59' },
  { key: 'hour', label: '小时', range: '0-23' },
  { key: 'dayOfMonth', label: '日', range: '1-31' },
  { key: 'month', label: '月', range: '1-12 或 JAN-DEC' },
  { key: 'dayOfWeek', label: '星期', range: '0-6 或 SUN-SAT' },
];

/** Breaks a 5-field cron expression into human-readable parts. */
export default function CronTool(): JSX.Element {
  const [expr, setExpr] = useState<string>('0 9 * * 1-5');
  const [parts, setParts] = useState<string[] | null>(null);
  const [error, setError] = useState<string>('');

  const parse = (): void => {
    setError('');
    const tokens: string[] = expr.trim().split(/\s+/);
    if (tokens.length !== 5) {
      setError('标准 cron 需要 5 个字段：分 时 日 月 星期');
      setParts(null);
      return;
    }
    setParts(tokens);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="Cron 表达式"
        fullWidth
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        className="mono"
        helperText="格式：分钟 小时 日 月 星期"
      />
      <Button variant="contained" onClick={parse} disabled={!expr}>
        解析
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {parts && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {FIELDS.map((f, i) => (
            <Typography key={f.key} sx={{ py: 0.5 }}>
              <strong>{f.label}</strong>（{f.range}）：<span className="mono">{parts[i]}</span>
            </Typography>
          ))}
        </Paper>
      )}
    </Stack>
  );
}
