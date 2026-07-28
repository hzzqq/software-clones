import { useMemo, useState } from 'react';
import { Alert, Button, Chip, Paper, Stack, TextField } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { copyToClipboard } from '../../utils/format';
import { tryJsonToYaml, tryYamlToJson } from '../../utils/tools';

type Mode = 'json-to-yaml' | 'yaml-to-json';

/** Converts between JSON and YAML, with live validity feedback. */
export default function YamlTool(): JSX.Element {
  const [mode, setMode] = useState<Mode>('json-to-yaml');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const validation = useMemo(() => {
    if (!input.trim()) return null;
    return mode === 'json-to-yaml' ? tryJsonToYaml(input) : tryYamlToJson(input);
  }, [input, mode]);

  const run = (): void => {
    setError('');
    const result = validation ?? (mode === 'json-to-yaml' ? tryJsonToYaml(input) : tryYamlToJson(input));
    if (!result.ok) {
      setError('转换失败：' + (result.error ?? '输入无效'));
      setOutput('');
      return;
    }
    setOutput(result.value ?? '');
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button
          variant={mode === 'json-to-yaml' ? 'contained' : 'outlined'}
          onClick={() => setMode('json-to-yaml')}
        >
          JSON → YAML
        </Button>
        <Button
          variant={mode === 'yaml-to-json' ? 'contained' : 'outlined'}
          onClick={() => setMode('yaml-to-json')}
        >
          YAML → JSON
        </Button>
      </Stack>
      <TextField
        label="输入"
        multiline
        minRows={6}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={run} disabled={!input}>
          转换
        </Button>
        {output && (
          <Button variant="text" onClick={() => void copyToClipboard(output)}>
            复制结果
          </Button>
        )}
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {validation && (
        <Chip
          icon={validation.ok ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
          label={validation.ok ? '有效的输入' : '输入无效'}
          color={validation.ok ? 'success' : 'error'}
          size="small"
          variant="outlined"
        />
      )}
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
