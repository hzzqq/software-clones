import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '../../utils/format';
import { base64Encode, base64Decode } from '../../utils/tools';

type Mode = 'encode' | 'decode';

/** Encodes/decodes UTF-8 safe Base64. */
export default function Base64Tool(): JSX.Element {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const run = (): void => {
    setError('');
    try {
      if (mode === 'encode') {
        setOutput(base64Encode(input));
      } else {
        setOutput(base64Decode(input));
      }
    } catch {
      setError('解码失败：输入不是合法的 Base64 字符串');
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant={mode === 'encode' ? 'contained' : 'outlined'} onClick={() => setMode('encode')}>
          编码
        </Button>
        <Button variant={mode === 'decode' ? 'contained' : 'outlined'} onClick={() => setMode('decode')}>
          解码
        </Button>
      </Box>
      <TextField
        label={mode === 'encode' ? '原始文本' : 'Base64 文本'}
        multiline
        minRows={4}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Box>
        <Button variant="contained" onClick={run} disabled={!input}>
          {mode === 'encode' ? '编码' : '解码'}
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <TextField
              multiline
              minRows={4}
              fullWidth
              value={output}
              InputProps={{ readOnly: true }}
              className="mono"
            />
            <IconButton onClick={() => void copyToClipboard(output)} aria-label="copy" sx={{ mt: 1 }}>
              <ContentCopyIcon />
            </IconButton>
          </Box>
        </Paper>
      )}
    </Stack>
  );
}
