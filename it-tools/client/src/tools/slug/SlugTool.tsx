import { useState } from 'react';
import { Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { slugify } from '../../utils/tools';

type Separator = '-' | '_' | '.';

/** Converts text into a URL-friendly slug. */
export default function SlugTool(): JSX.Element {
  const [input, setInput] = useState<string>('Hello World! 这是 Test 123');
  const [sep, setSep] = useState<Separator>('-');
  const [output, setOutput] = useState<string>('');

  const run = (): void => {
    setOutput(slugify(input, sep));
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="输入文本"
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl sx={{ width: 140 }}>
          <InputLabel>分隔符</InputLabel>
          <Select label="分隔符" value={sep} onChange={(e) => setSep(e.target.value as Separator)}>
            <MenuItem value="-">短横 -</MenuItem>
            <MenuItem value="_">下划线 _</MenuItem>
            <MenuItem value=".">点 .</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={run} disabled={!input}>
          生成 Slug
        </Button>
      </Stack>
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
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
