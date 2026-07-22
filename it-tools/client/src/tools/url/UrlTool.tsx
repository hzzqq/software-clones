import { useState } from 'react';
import {
  Alert,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '../../utils/format';
import { urlEncode, urlEncodeComponent, urlDecode } from '../../utils/tools';

type Mode = 'encode' | 'decode' | 'encode-component';

/** URL-encodes / decodes strings (component variant for full safety). */
export default function UrlTool(): JSX.Element {
  const [mode, setMode] = useState<Mode>('encode-component');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const run = (): void => {
    setError('');
    try {
      if (mode === 'encode') {
        setOutput(urlEncode(input));
      } else if (mode === 'encode-component') {
        setOutput(urlEncodeComponent(input));
      } else {
        setOutput(urlDecode(input));
      }
    } catch (e) {
      setError('处理失败：' + (e as Error).message);
      setOutput('');
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button
          variant={mode === 'encode' ? 'contained' : 'outlined'}
          onClick={() => setMode('encode')}
        >
          encodeURI
        </Button>
        <Button
          variant={mode === 'encode-component' ? 'contained' : 'outlined'}
          onClick={() => setMode('encode-component')}
        >
          encodeURIComponent
        </Button>
        <Button
          variant={mode === 'decode' ? 'contained' : 'outlined'}
          onClick={() => setMode('decode')}
        >
          解码
        </Button>
      </Stack>
      <TextField
        label="输入"
        multiline
        minRows={3}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Button variant="contained" onClick={run} disabled={!input}>
        处理
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
          <IconButton onClick={() => void copyToClipboard(output)} aria-label="copy" sx={{ mt: 1 }}>
            <ContentCopyIcon />
          </IconButton>
        </Paper>
      )}
    </Stack>
  );
}
