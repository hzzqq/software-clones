import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

/** Converts text to / from Morse code. */
export default function MorseTool(): JSX.Element {
  const [mode, setMode] = useState<'to' | 'from'>('to');
  const [input, setInput] = useState<string>('SOS HELLO');
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const run = (): void => {
    setError('');
    try {
      if (mode === 'to') {
        const out = input
          .toUpperCase()
          .split('')
          .map((ch) => {
            if (ch === ' ') return '/';
            return MORSE[ch] ?? ch;
          })
          .join(' ');
        setOutput(out);
      } else {
        const out = input
          .trim()
          .split(/\s+/)
          .map((code) => {
            if (code === '/') return ' ';
            const found = Object.entries(MORSE).find(([, v]) => v === code);
            return found ? found[0] : code;
          })
          .join('');
        setOutput(out);
      }
    } catch (e) {
      setError('处理失败：' + (e as Error).message);
      setOutput('');
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant={mode === 'to' ? 'contained' : 'outlined'} onClick={() => setMode('to')}>
          文本 → 摩斯
        </Button>
        <Button variant={mode === 'from' ? 'contained' : 'outlined'} onClick={() => setMode('from')}>
          摩斯 → 文本
        </Button>
      </Stack>
      <TextField
        label="输入"
        multiline
        minRows={3}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mono"
        helperText="摩斯模式用空格分隔，/ 表示单词间隔"
      />
      <Button variant="contained" onClick={run} disabled={!input}>
        转换
      </Button>
      {error && <Alert severity="error">{error}</Alert>}
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <TextField
            multiline
            minRows={3}
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
