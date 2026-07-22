import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { copyToClipboard } from '../../utils/format';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?';

/** Generates strong random passwords with configurable character sets. */
export default function PasswordTool(): JSX.Element {
  const [length, setLength] = useState<number>(16);
  const [withUpper, setWithUpper] = useState<boolean>(true);
  const [withLower, setWithLower] = useState<boolean>(true);
  const [withDigit, setWithDigit] = useState<boolean>(true);
  const [withSymbol, setWithSymbol] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');

  const generate = (): void => {
    let chars = '';
    if (withLower) chars += LOWER;
    if (withUpper) chars += UPPER;
    if (withDigit) chars += DIGITS;
    if (withSymbol) chars += SYMBOLS;
    if (!chars) {
      setPassword('');
      return;
    }
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    setPassword(result);
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ width: 320 }}>
        <Typography gutterBottom>长度：{length}</Typography>
        <Slider
          value={length}
          min={4}
          max={64}
          onChange={(_, v) => setLength(v as number)}
        />
      </Box>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <FormControlLabel control={<Checkbox checked={withUpper} onChange={(e) => setWithUpper(e.target.checked)} />} label="大写" />
        <FormControlLabel control={<Checkbox checked={withLower} onChange={(e) => setWithLower(e.target.checked)} />} label="小写" />
        <FormControlLabel control={<Checkbox checked={withDigit} onChange={(e) => setWithDigit(e.target.checked)} />} label="数字" />
        <FormControlLabel control={<Checkbox checked={withSymbol} onChange={(e) => setWithSymbol(e.target.checked)} />} label="符号" />
      </Stack>
      <Button variant="contained" onClick={generate}>
        生成密码
      </Button>
      {password && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography className="mono" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>
              {password}
            </Typography>
            <Button size="small" onClick={() => void copyToClipboard(password)}>
              复制
            </Button>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
