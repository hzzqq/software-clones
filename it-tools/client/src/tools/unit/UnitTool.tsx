import { useState } from 'react';
import { Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';

type Category = 'length' | 'weight' | 'temperature';

const UNITS: Record<Category, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.344, foot: 0.3048, inch: 0.0254 },
  weight: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.0283495231 },
  temperature: {},
};

/** Converts values among length / weight / temperature units. */
export default function UnitTool(): JSX.Element {
  const [category, setCategory] = useState<Category>('length');
  const [from, setFrom] = useState<string>('m');
  const [to, setTo] = useState<string>('cm');
  const [value, setValue] = useState<string>('1');
  const [result, setResult] = useState<string>('');

  const convert = (): void => {
    const v = Number(value);
    if (Number.isNaN(v)) {
      setResult('请输入合法数值');
      return;
    }
    if (category === 'temperature') {
      setResult(formatTemp(v, from, to));
      return;
    }
    const map = UNITS[category];
    const base = v * map[from];
    setResult(String(base / map[to]));
  };

  const formatTemp = (v: number, f: string, t: string): string => {
    let c: number;
    if (f === 'C') c = v;
    else if (f === 'F') c = ((v - 32) * 5) / 9;
    else c = v - 273.15;
    if (t === 'C') return String(c);
    if (t === 'F') return String((c * 9) / 5 + 32);
    return String(c + 273.15);
  };

  const unitOptions =
    category === 'temperature'
      ? ['C', 'F', 'K']
      : Object.keys(UNITS[category]);

  return (
    <Stack spacing={2}>
      <FormControl sx={{ width: 200 }}>
        <InputLabel>类别</InputLabel>
        <Select
          label="类别"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as Category);
            setFrom(unitOptions[0]);
            setTo(unitOptions[1] ?? unitOptions[0]);
          }}
        >
          <MenuItem value="length">长度</MenuItem>
          <MenuItem value="weight">重量</MenuItem>
          <MenuItem value="temperature">温度</MenuItem>
        </Select>
      </FormControl>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <TextField label="数值" value={value} onChange={(e) => setValue(e.target.value)} sx={{ width: 140 }} />
        <FormControl sx={{ width: 120 }}>
          <InputLabel>从</InputLabel>
          <Select label="从" value={from} onChange={(e) => setFrom(e.target.value)}>
            {unitOptions.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography>→</Typography>
        <FormControl sx={{ width: 120 }}>
          <InputLabel>到</InputLabel>
          <Select label="到" value={to} onChange={(e) => setTo(e.target.value)}>
            {unitOptions.map((u) => (
              <MenuItem key={u} value={u}>
                {u}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Button variant="contained" onClick={convert}>
        换算
      </Button>
      {result && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography className="mono">
            结果：{result} {to}{' '}
            <Button size="small" onClick={() => void copyToClipboard(result)}>
              复制
            </Button>
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}
