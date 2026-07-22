import { useState } from 'react';
import { Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

function toCamel(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
}
function toPascal(s: string): string {
  const camel = toCamel(s);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
function toSnake(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_|_$/g, '');
}
function toKebab(s: string): string {
  return toSnake(s).replace(/_/g, '-');
}
function toTitle(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Converts text between common naming / casing styles. */
export default function CaseTool(): JSX.Element {
  const [input, setInput] = useState<string>('Hello World fooBar');
  const [results, setResults] = useState<Record<string, string>>({});

  const convert = (): void => {
    setResults({
      lower: input.toLowerCase(),
      UPPER: input.toUpperCase(),
      camel: toCamel(input),
      Pascal: toPascal(input),
      snake: toSnake(input),
      kebab: toKebab(input),
      Title: toTitle(input),
    });
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="输入文本"
        multiline
        minRows={3}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Button variant="contained" onClick={convert} disabled={!input}>
        转换
      </Button>
      {Object.keys(results).length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {Object.entries(results).map(([k, v]) => (
            <Typography key={k} sx={{ py: 0.5 }} className="mono">
              {k}：{v}{' '}
              <Button size="small" onClick={() => void copyToClipboard(v)}>
                复制
              </Button>
            </Typography>
          ))}
        </Paper>
      )}
    </Stack>
  );
}
