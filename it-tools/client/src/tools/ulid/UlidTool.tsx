import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { generateUlids, isValidUlid, ulidTime } from './ulid';

/** 生成可排序的 ULID（Crockford Base32）。 */
export default function UlidTool(): JSX.Element {
  const [count, setCount] = useState<number>(1);
  const [list, setList] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const generate = (): void => {
    setError('');
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      setError('数量需为 1 ~ 100 之间的整数');
      return;
    }
    setList(generateUlids(n));
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="数量"
          type="number"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          sx={{ width: 140 }}
        />
        <Button variant="contained" onClick={generate} disabled={!count}>
          生成
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        {list.length === 0 ? (
          <Typography color="text.secondary">点击「生成」创建一个或多个 ULID。</Typography>
        ) : (
          <Stack spacing={1}>
            {list.map((id, i) => {
              const ts = ulidTime(id);
              return (
                <Typography key={i} sx={{ py: 0.25 }} className="mono">
                  {id} {ts ? `· ${new Date(ts).toISOString()}` : ''}{' '}
                  <Button size="small" onClick={() => void copyToClipboard(id)}>
                    复制
                  </Button>
                </Typography>
              );
            })}
          </Stack>
        )}
      </Paper>
      <Typography variant="caption" color="text.secondary">
        校验：{list.length > 0 ? (list.every(isValidUlid) ? '全部合法' : '存在非法') : '—'}
      </Typography>
    </Stack>
  );
}
