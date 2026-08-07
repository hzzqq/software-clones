import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { formatXml, looksLikeXml } from './xml';

/** 美化（缩进格式化）XML 文本。 */
export default function XmlTool(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [indent, setIndent] = useState<number>(2);
  const [error, setError] = useState<string>('');

  const format = (): void => {
    setError('');
    if (!input.trim()) {
      setOutput('');
      setError('请输入 XML 文本');
      return;
    }
    if (!looksLikeXml(input)) {
      setError('未检测到标签，可能不是 XML 文本');
    }
    try {
      setOutput(formatXml(input, Math.max(1, Math.floor(indent))));
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="XML 输入"
        multiline
        minRows={6}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mono"
        placeholder="<root><child>text</child></root>"
      />
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="缩进空格"
          type="number"
          value={indent}
          onChange={(e) => setIndent(Number(e.target.value))}
          sx={{ width: 140 }}
        />
        <Button variant="contained" onClick={format} disabled={!input.trim()}>
          格式化
        </Button>
      </Stack>
      {error && <Alert severity={looksLikeXml(input) ? 'info' : 'error'}>{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <TextField
          label="格式化结果"
          multiline
          minRows={6}
          fullWidth
          value={output}
          InputProps={{ readOnly: true }}
          className="mono"
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
