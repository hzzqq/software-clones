import { useState } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { copyToClipboard, downloadText } from '../../utils/format';
import { csvToJson, jsonToCsv } from '../../utils/tools';

type Direction = 'json2csv' | 'csv2json';

/** Convert between JSON (array of objects) and CSV — a common dev chore. */
export default function JsonCsvTool(): JSX.Element {
  const [direction, setDirection] = useState<Direction>('json2csv');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [withHeader, setWithHeader] = useState<boolean>(true);

  const convert = (): void => {
    setError(null);
    if (!input.trim()) {
      setError('请输入待转换的内容');
      return;
    }
    try {
      const result: string =
        direction === 'json2csv'
          ? jsonToCsv(input, ',', withHeader)
          : csvToJson(input, ',', withHeader);
      setOutput(result);
    } catch (e) {
      setOutput('');
      setError(e instanceof Error ? e.message : '转换失败');
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant={direction === 'json2csv' ? 'contained' : 'outlined'}
          onClick={() => setDirection('json2csv')}
        >
          JSON → CSV
        </Button>
        <Button
          variant={direction === 'csv2json' ? 'contained' : 'outlined'}
          onClick={() => setDirection('csv2json')}
        >
          CSV → JSON
        </Button>
        <FormControlLabel
          control={
            <Switch checked={withHeader} onChange={(e) => setWithHeader(e.target.checked)} />
          }
          label="包含表头"
        />
      </Box>

      <TextField
        label="输入"
        multiline
        minRows={6}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          direction === 'json2csv'
            ? '[{"name":"A","age":1},{"name":"B","age":2}]'
            : 'name,age\nA,1\nB,2'
        }
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={convert}>
          转换
        </Button>
        <Button
          variant="outlined"
          disabled={!output}
          onClick={() => void copyToClipboard(output)}
        >
          复制结果
        </Button>
        <Button
          variant="outlined"
          disabled={!output}
          onClick={() => downloadText(output, direction === 'json2csv' ? 'out.csv' : 'out.json')}
        >
          下载
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {output ? (
        <Paper variant="outlined" sx={{ p: 2, maxHeight: 360, overflow: 'auto' }}>
          <Typography className="mono" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 13, m: 0 }}>
            {output}
          </Typography>
        </Paper>
      ) : (
        <Typography variant="body2" color="text.secondary">
          转换结果将显示在此处。
        </Typography>
      )}
    </Stack>
  );
}
