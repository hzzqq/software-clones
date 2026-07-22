import { useState } from 'react';
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

/** Tests a regular expression against input text and lists matches. */
export default function RegexTool(): JSX.Element {
  const [pattern, setPattern] = useState<string>('(\\w+)@(\\w+)');
  const [flags, setFlags] = useState<string>('g');
  const [text, setText] = useState<string>('联系 alice@example.com 或 bob@test.org');
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const test = (): void => {
    setError('');
    setMatches([]);
    if (!pattern) {
      return;
    }
    try {
      const re: RegExp = new RegExp(pattern, flags);
      const found: string[] = [];
      if (flags.includes('g')) {
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          found.push(m[0]);
          if (m.index === re.lastIndex) {
            re.lastIndex++;
          }
        }
      } else {
        const m: RegExpExecArray | null = re.exec(text);
        if (m) {
          found.push(m[0]);
        }
      }
      setMatches(found);
    } catch (e) {
      setError('正则表达式无效：' + (e as Error).message);
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="正则表达式"
          fullWidth
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <TextField
          label="标志"
          sx={{ width: 120 }}
          value={flags}
          onChange={(e) => setFlags(e.target.value)}
          helperText="g/i/m/s"
        />
      </Box>
      <TextField
        label="测试文本"
        multiline
        minRows={4}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Box>
        <Button variant="contained" onClick={test}>
          测试
        </Button>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {!error && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            匹配结果（{matches.length}）
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {matches.map((m, i) => (
              <Chip key={i} label={m} onDelete={() => void copyToClipboard(m)} />
            ))}
            {matches.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                无匹配
              </Typography>
            )}
          </Box>
        </Paper>
      )}
    </Stack>
  );
}
