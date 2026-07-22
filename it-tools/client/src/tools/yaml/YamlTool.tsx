import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { jsonToYaml, yamlToJson } from '../../utils/tools';

type Mode = 'json-to-yaml' | 'yaml-to-json';

/** Converts between JSON and YAML. */
export default function YamlTool(): JSX.Element {
  const [mode, setMode] = useState<Mode>('json-to-yaml');
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const run = (): void => {
    setError('');
    try {
      if (mode === 'json-to-yaml') {
        setOutput(jsonToYaml(input));
      } else {
        setOutput(yamlToJson(input));
      }
    } catch (e) {
      setError('转换失败：' + (e as Error).message);
      setOutput('');
    }
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
