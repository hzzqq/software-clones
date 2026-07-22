import { useState } from 'react';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

const BASES = [2, 8, 10, 16] as const;
type Base = (typeof BASES)[number];

/** Converts a number between binary / octal / decimal / hexadecimal. */
export default function NumberBaseTool(): JSX.Element {
  const [value, setValue] = useState<string>('255');
  const [fromBase, setFromBase] = useState<Base>(10);
  const [error, setError] = useState<string>('');

  const toDecimal = (): number | null => {
    const v: string = value.trim();
    if (!v) {
      setError('请输入要转换的数值');
      return null;
    }
    const decimal: number = parseInt(v, fromBase);
    if (Number.isNaN(decimal)) {
      setError(`输入不是合法的 ${fromBase} 进制数`);
      return null;
    }
    setError('');
    return decimal;
  };

  const convert = (to: Base): string | null => {
    const decimal = toDecimal();
    if (decimal === null) {
      return null;
    }
    return decimal.toString(to).toUpperCase();
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="数值"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mono"
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          label="源进制"
          value={fromBase}
          onChange={(e) => setFromBase(Number(e.target.value) as Base)}
          sx={{ width: 130 }}
          SelectProps={{ native: true }}
        >
          {BASES.map((b) => (
            <option key={b} value={b}>
              {b} 进制
            </option>
          ))}
        </TextField>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        {BASES.filter((b) => b !== fromBase).map((b) => {
          const out = convert(b);
          return (
            <Typography key={b} sx={{ py: 0.5 }} className="mono">
              {b} 进制：{out ?? '—'}{' '}
              {out && (
                <Button size="small" onClick={() => void copyToClipboard(out)}>
                  复制
                </Button>
              )}
            </Typography>
          );
        })}
      </Paper>
      <Button variant="contained" onClick={() => toDecimal()} disabled={!value}>
        转换
      </Button>
    </Stack>
  );
}
