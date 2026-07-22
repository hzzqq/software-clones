import { useState } from 'react';
import CryptoJS from 'crypto-js';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

/** AES encrypt / decrypt using a passphrase (crypto-js). */
export default function AesTool(): JSX.Element {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [text, setText] = useState<string>('Hello, IT Tools!');
  const [passphrase, setPassphrase] = useState<string>('secret');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const run = (): void => {
    setError('');
    try {
      if (mode === 'encrypt') {
        const cipher = CryptoJS.AES.encrypt(text, passphrase);
        setOutput(cipher.toString());
      } else {
        const bytes = CryptoJS.AES.decrypt(text.trim(), passphrase);
        const plain = bytes.toString(CryptoJS.enc.Utf8);
        if (!plain) {
          setError('解密失败：密码错误或密文无效');
          setOutput('');
          return;
        }
        setOutput(plain);
      }
    } catch (e) {
      setError('处理失败：' + (e as Error).message);
      setOutput('');
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant={mode === 'encrypt' ? 'contained' : 'outlined'} onClick={() => setMode('encrypt')}>
          加密
        </Button>
        <Button variant={mode === 'decrypt' ? 'contained' : 'outlined'} onClick={() => setMode('decrypt')}>
          解密
        </Button>
      </Stack>
      <TextField
        label={mode === 'encrypt' ? '明文' : '密文'}
        multiline
        minRows={3}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mono"
      />
      <TextField
        label="密码 (passphrase)"
        type="password"
        fullWidth
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
      />
      <Button variant="contained" onClick={run} disabled={!text || !passphrase}>
        {mode === 'encrypt' ? '加密' : '解密'}
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
            multiline
            minRows={3}
            fullWidth
            value={output}
            InputProps={{ readOnly: true }}
            className="mono"
          />
          <Button size="small" sx={{ mt: 1 }} onClick={() => void copyToClipboard(output)}>
            复制
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
