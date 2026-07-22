import { useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { timestampToIso, isoToTimestampSeconds } from '../../utils/tools';

/** Converts between Unix timestamps (seconds/milliseconds) and ISO dates. */
export default function TimestampTool(): JSX.Element {
  const [ts, setTs] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [error, setError] = useState<string>('');

  const useNow = (): void => {
    const now: number = Date.now();
    setTs(String(now));
    setDateStr(new Date(now).toISOString());
    setError('');
  };

  const tsToDate = (): void => {
    setError('');
    try {
      setDateStr(timestampToIso(ts));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const dateToTs = (): void => {
    setError('');
    try {
      setTs(isoToTimestampSeconds(dateStr));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Stack spacing={2}>
      <Button variant="outlined" onClick={useNow}>
        使用当前时间
      </Button>
      <Paper variant="outlined" sx={{ p: 2 }}>

        <Typography variant="subtitle2" gutterBottom>
          Unix 时间戳 → 日期
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="时间戳（秒或毫秒）"
            fullWidth
            value={ts}
            onChange={(e) => setTs(e.target.value)}
          />
          <Button variant="contained" onClick={tsToDate}>
            转换
          </Button>
        </Stack>
        {dateStr && (
          <Typography className="mono" sx={{ mt: 1 }}>
            {dateStr}{' '}
            <Button size="small" onClick={() => void copyToClipboard(dateStr)}>
              复制
            </Button>
          </Typography>
        )}
      </Paper>

      <Divider />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          日期 → Unix 时间戳
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="日期（如 2025-07-22T12:00:00Z）"
            fullWidth
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
          <Button variant="contained" onClick={dateToTs}>
            转换
          </Button>
        </Stack>
        {ts && (
          <Typography className="mono" sx={{ mt: 1 }}>
            秒：{ts}
            <Button size="small" onClick={() => void copyToClipboard(ts)}>
              复制
            </Button>
          </Typography>
        )}
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
