import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

interface JwtPart {
  header: unknown;
  payload: unknown;
  signature: string;
}

function decodeBase64Url(input: string): string {
  let s: string = input.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) {
    s += '=';
  }
  const binary: string = atob(s);
  const bytes: Uint8Array = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Decodes (without verifying) a JWT into header / payload / signature. */
export default function JwtTool(): JSX.Element {
  const [token, setToken] = useState<string>('');
  const [decoded, setDecoded] = useState<JwtPart | null>(null);
  const [error, setError] = useState<string>('');

  const decode = (): void => {
    setError('');
    const parts: string[] = token.trim().split('.');
    if (parts.length !== 3) {
      setError('JWT 必须由 header.payload.signature 三段组成');
      setDecoded(null);
      return;
    }
    try {
      const header: unknown = JSON.parse(decodeBase64Url(parts[0]));
      const payload: unknown = JSON.parse(decodeBase64Url(parts[1]));
      setDecoded({ header, payload, signature: parts[2] });
    } catch (e) {
      setError('解码失败：' + (e as Error).message);
      setDecoded(null);
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="JWT"
        multiline
        minRows={3}
        fullWidth
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="mono"
      />
      <Button variant="contained" onClick={decode} disabled={!token}>
        解码
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {decoded && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
            label="Header"
            multiline
            minRows={3}
            fullWidth
            value={JSON.stringify(decoded.header, null, 2)}
            InputProps={{ readOnly: true }}
            className="mono"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Payload"
            multiline
            minRows={4}
            fullWidth
            value={JSON.stringify(decoded.payload, null, 2)}
            InputProps={{ readOnly: true }}
            className="mono"
          />
          <Button sx={{ mt: 1 }} size="small" onClick={() => void copyToClipboard(JSON.stringify(decoded.payload, null, 2))}>
            复制 Payload
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
