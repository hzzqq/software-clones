import { useMemo, useState } from 'react';
import { Alert, Button, Chip, Paper, Stack, TextField } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { copyToClipboard } from '../../utils/format';
import { formatJson, minifyJson, parseJson } from '../../utils/tools';

/** Formats (pretty-prints) and validates JSON input, with live feedback. */
export default function JsonTool(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Live validation — recomputed on every keystroke so the user sees validity
  // and, when invalid, the exact line/column of the first syntax error.
  const validation = useMemo(() => {
    if (!input.trim()) return null;
    return parseJson(input);
  }, [input]);

  const run = (transform: (s: string) => string): void => {
    setError('');
    const result = parseJson(input);
    if (!result.ok) {
      const where =
        result.line !== undefined
          ? `（第 ${result.line} 行第 ${result.column} 列）`
          : '';
      setError(`JSON 解析失败：${result.error}${where}`);
      setOutput('');
      return;
    }
    try {
      setOutput(transform(input));
    } catch (e) {
      setError('JSON 处理失败：' + (e as Error).message);
      setOutput('');
    }
  };

  const format = (): void => run(formatJson);
  const minify = (): void => run(minifyJson);

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
      {validation && (
        <Chip
          icon={validation.ok ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
          label={
            validation.ok
              ? '有效的 JSON'
              : validation.line !== undefined
                ? `无效的 JSON（第 ${validation.line} 行第 ${validation.column} 列）`
                : '无效的 JSON'
          }
          color={validation.ok ? 'success' : 'error'}
          variant="outlined"
          size="small"
        />
      )}
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
