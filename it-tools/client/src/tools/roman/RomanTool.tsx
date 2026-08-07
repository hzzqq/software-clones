import { useState } from 'react';
import { Alert, Paper, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { arabicToRoman, romanToArabic } from './roman';

/** 罗马数字 ↔ 阿拉伯数字（1 ~ 3999）。 */
export default function RomanTool(): JSX.Element {
  const [arabic, setArabic] = useState<string>('2024');
  const [roman, setRoman] = useState<string>('MMXXIV');
  const [error, setError] = useState<string>('');

  const onArabic = (value: string): void => {
    setArabic(value);
    setError('');
    const n = Number(value);
    if (!value.trim()) {
      setRoman('');
      return;
    }
    const r = arabicToRoman(n);
    if (r === null) {
      setError('阿拉伯数字需在 1 ~ 3999 之间');
      setRoman('');
      return;
    }
    setRoman(r);
  };

  const onRoman = (value: string): void => {
    setRoman(value);
    setError('');
    if (!value.trim()) {
      setArabic('');
      return;
    }
    const a = romanToArabic(value);
    if (a === null) {
      setError('非法罗马数字（仅允许 I~M，且符合减法记法）');
      setArabic('');
      return;
    }
    setArabic(String(a));
  };

  return (
    <Stack spacing={2}>
      <TextField
        label="阿拉伯数字（1 ~ 3999）"
        value={arabic}
        onChange={(e) => onArabic(e.target.value)}
        className="mono"
      />
      <TextField
        label="罗马数字"
        value={roman}
        onChange={(e) => onRoman(e.target.value)}
        className="mono"
      />
      {error && <Alert severity="error">{error}</Alert>}
      {roman && !error && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography className="mono" sx={{ fontSize: 18 }}>
            {roman}{' '}
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ cursor: 'pointer' }}
              onClick={() => void copyToClipboard(roman)}
            >
              （点击复制）
            </Typography>
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}
