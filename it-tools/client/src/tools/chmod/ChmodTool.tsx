import { useState } from 'react';
import { Alert, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { copyToClipboard } from '../../utils/format';
import { describeChmod, parseChmod, permissionsToSymbolic } from './chmod';

/** 数字权限（755）与符号权限（rwxr-xr-x）互转，并展示逐类别拆分。 */
export default function ChmodTool(): JSX.Element {
  const [numeric, setNumeric] = useState<string>('755');
  const [symbolic, setSymbolic] = useState<string>('rwxr-xr-x');
  const [error, setError] = useState<string>('');

  const applyNumeric = (value: string): void => {
    setNumeric(value);
    setError('');
    const mode = parseChmod(value);
    if (mode === null) {
      setError('数字权限需为 0~777');
      return;
    }
    setSymbolic(permissionsToSymbolic(mode));
  };

  const applySymbolic = (value: string): void => {
    setSymbolic(value);
    setError('');
    const mode = parseChmod(value);
    if (mode === null) {
      setError('符号权限须为 9 位 rwx-（如 rwxr-xr-x）');
      return;
    }
    setNumeric(String(mode));
  };

  const mode = parseChmod(numeric);
  const breakdown = mode === null ? [] : describeChmod(mode);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="数字权限"
          value={numeric}
          onChange={(e) => applyNumeric(e.target.value)}
          className="mono"
          sx={{ width: 180 }}
        />
        <TextField
          label="符号权限"
          value={symbolic}
          onChange={(e) => applySymbolic(e.target.value)}
          className="mono"
          sx={{ width: 240 }}
        />
        <Chip
          label="复制符号"
          onClick={() => symbolic && void copyToClipboard(symbolic)}
          sx={{ cursor: 'pointer' }}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          拆解
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>类别</TableCell>
              <TableCell>读 (r)</TableCell>
              <TableCell>写 (w)</TableCell>
              <TableCell>执行 (x)</TableCell>
              <TableCell>数字</TableCell>
              <TableCell>符号</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakdown.map((b) => (
              <TableRow key={b.cls}>
                <TableCell>{b.cls}</TableCell>
                <TableCell>{b.read ? '✓' : '—'}</TableCell>
                <TableCell>{b.write ? '✓' : '—'}</TableCell>
                <TableCell>{b.execute ? '✓' : '—'}</TableCell>
                <TableCell className="mono">{b.value}</TableCell>
                <TableCell className="mono">{b.symbol}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
