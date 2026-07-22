import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { formatJson, minifyJson } from '../../utils/tools';

/** Formats (pretty-prints) and validates JSON input. */
export default function JsonTool(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const format = (): void => {
    setError('');
    try {
      setOutput(formatJson(input));
    } catch (e) {
      setError('JSON 解析失败：' + (e as Error).message);
      setOutput('');
    }
  };

  const minify = (): void => {
    setError('');
    try {
      setOutput(minifyJson(input));
    } catch (e) {
      setError('JSON 解析失败：' + (e as Error).message);
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="JSON 输入"
        multiline
        minRows={6}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={format} disabled={!input}>
          格式化
        </Button>
        <Button variant="outlined" onClick={minify} disabled={!input}>
          压缩
        </Button>
        {output && (
          <Button variant="text" onClick={() => void copyToClipboard(output)}>
            复制结果
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
            multiline
            minRows={6}
            fullWidth
            value={output}
            InputProps={{ readOnly: true }}
            className="mono"
          />
        </Paper>
      )}
    </Stack>
  );
}
