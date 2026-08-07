import { useState } from 'react';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { HMAC_ALGOS, HMAC_FORMATS, hmac } from './hmac';

/** 使用密钥计算消息的 HMAC（hex / Base64）。 */
export default function HmacTool(): JSX.Element {
  const [message, setMessage] = useState<string>('hello world');
  const [secret, setSecret] = useState<string>('secret');
  const [algo, setAlgo] = useState<string>('SHA256');
  const [format, setFormat] = useState<string>('hex');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const compute = (): void => {
    setError('');
    try {
      const out = hmac(
        algo as (typeof HMAC_ALGOS)[number],
        message,
        secret,
        format as (typeof HMAC_FORMATS)[number],
      );
      setOutput(out);
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="消息"
        multiline
        minRows={3}
        fullWidth
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="mono"
      />
      <TextField
        label="密钥"
        type="password"
        fullWidth
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="mono"
      />
      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="算法"
          value={algo}
          onChange={(e) => setAlgo(e.target.value)}
          sx={{ width: 160 }}
        >
          {HMAC_ALGOS.map((a) => (
            <MenuItem key={a} value={a}>
              {a}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="输出格式"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          sx={{ width: 160 }}
        >
          {HMAC_FORMATS.map((f) => (
            <MenuItem key={f} value={f}>
              {f}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={compute} sx={{ alignSelf: 'center' }}>
          计算
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {algo} · {format}
        </Typography>
        <TextField
          label="结果"
          multiline
          minRows={2}
          fullWidth
          value={output}
          InputProps={{ readOnly: true }}
          className="mono"
          sx={{ mt: 0.5 }}
        />
        {output && (
          <Button size="small" sx={{ mt: 1 }} onClick={() => void copyToClipboard(output)}>
            复制
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
