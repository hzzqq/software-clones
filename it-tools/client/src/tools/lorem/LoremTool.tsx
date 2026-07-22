import { useState } from 'react';
import { Button, Paper, Slider, Stack, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
];

function sentence(rng: () => number): string {
  const len = 6 + Math.floor(rng() * 10);
  const words: string[] = [];
  for (let i = 0; i < len; i++) {
    words.push(WORDS[Math.floor(rng() * WORDS.length)]);
  }
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

/** Generates Lorem Ipsum text (paragraphs / words / sentences). */
export default function LoremTool(): JSX.Element {
  const [unit, setUnit] = useState<'paragraphs' | 'words' | 'sentences'>('paragraphs');
  const [count, setCount] = useState<number>(3);
  const [output, setOutput] = useState<string>('');

  const mulberry32 = (seed: number): (() => number) => {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const generate = (): void => {
    const rng = mulberry32(Date.now());
    if (unit === 'words') {
      const n = Math.max(1, count);
      const words: string[] = [];
      for (let i = 0; i < n; i++) words.push(WORDS[Math.floor(rng() * WORDS.length)]);
      setOutput(words.join(' '));
      return;
    }
    if (unit === 'sentences') {
      const n = Math.max(1, count);
      const arr: string[] = [];
      for (let i = 0; i < n; i++) arr.push(sentence(rng));
      setOutput(arr.join(' '));
      return;
    }
    const n = Math.max(1, count);
    const paras: string[] = [];
    for (let p = 0; p < n; p++) {
      const sentences = 4 + Math.floor(rng() * 4);
      const arr: string[] = [];
      for (let i = 0; i < sentences; i++) arr.push(sentence(rng));
      paras.push(arr.join(' '));
    }
    setOutput(paras.join('\n\n'));
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant={unit === 'paragraphs' ? 'contained' : 'outlined'} onClick={() => setUnit('paragraphs')}>
          段落
        </Button>
        <Button variant={unit === 'sentences' ? 'contained' : 'outlined'} onClick={() => setUnit('sentences')}>
          句子
        </Button>
        <Button variant={unit === 'words' ? 'contained' : 'outlined'} onClick={() => setUnit('words')}>
          单词
        </Button>
      </Stack>
      <Typography>数量：{count}</Typography>
      <Slider value={count} min={1} max={unit === 'paragraphs' ? 10 : 100} onChange={(_, v) => setCount(v as number)} />
      <Button variant="contained" onClick={generate}>
        生成
      </Button>
      {output && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography sx={{ whiteSpace: 'pre-wrap' }}>{output}</Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={() => void copyToClipboard(output)}>
            复制
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
