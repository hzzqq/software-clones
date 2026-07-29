import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { encodeHtmlEntities, decodeHtmlEntities } from '../../utils/tools';

/** Encodes / decodes HTML entities. */
export default function HtmlEntityTool(): JSX.Element {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState<string>('<div class="x">Tom & Jerry\'s "show"</div>');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const run = (): void => {
    setError('');
    try {
      if (mode === 'encode') {
        setOutput(encodeHtmlEntities(input));
      } else {
        setOutput(decodeHtmlEntities(input));
      }
    } catch (e) {
      setError('处理失败：' + (e as Error).message);
      setOutput('');
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant={mode === 'encode' ? 'contained' : 'outlined'} onClick={() => setMode('encode')}>
          编码
        </Button>
        <Button variant={mode === 'decode' ? 'contained' : 'outlined'} onClick={() => setMode('decode')}>
          解码
        </Button>
      </Stack>
      <TextField
        label={mode === 'encode' ? '原始 HTML' : 'HTML 实体'}
        multiline
        minRows={4}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mono"
      />
      <Button variant="contained" onClick={run} disabled={!input}>
        处理
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
            multiline
            minRows={4}
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
