import { useState } from 'react';
import { Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import { textStats } from './textStats';

/** 实时统计文本的字符、单词、行数与字节数。 */
export default function TextStatsTool(): JSX.Element {
  const [text, setText] = useState<string>('');

  const stats = textStats(text);

  const items: Array<[string, number | string]> = [
    ['字符（含空白）', stats.characters],
    ['字符（不含空白）', stats.charactersNoSpaces],
    ['单词', stats.words],
    ['行', stats.lines],
    ['字节（UTF-8）', stats.bytes],
    ['最长行', stats.longestLine],
  ];

  return (
    <Stack spacing={2}>
      <TextField
        label="文本"
        multiline
        minRows={6}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mono"
        placeholder="在此输入或粘贴文本…"
      />
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          统计结果
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {items.map(([label, value]) => (
            <Chip key={label} variant="outlined" label={`${label}：${value}`} />
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
