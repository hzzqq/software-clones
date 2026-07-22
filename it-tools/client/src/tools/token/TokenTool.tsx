import { useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { copyToClipboard } from '../../utils/format';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Generates random tokens (hex / base62) using the Web Crypto API. */
export default function TokenTool(): JSX.Element {
  const [format, setFormat] = useState<'hex' | 'base62'>('hex');
  const [bytes, setBytes] = useState<number>(32);
  const [tokens, setTokens] = useState<string[]>([]);

  const generate = (): void => {
    const n = Math.max(1, Math.min(256, bytes || 1));
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    const value =
      format === 'hex'
        ? Array.from(arr)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        : Array.from(arr)
            .map((b) => ALPHABET[b % ALPHABET.length])
            .join('');
    setTokens(value.match(/.{1,64}/g) ?? [value]);
  };

  const CopyRow = ({ value }: { value: string }): JSX.Element => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
      <Typography className="mono" sx={{ flexGrow: 1, wordBreak: 'break-all', fontSize: 13 }}>
        {value}
      </Typography>
      <Box component="span" sx={{ cursor: 'pointer' }} onClick={() => void copyToClipboard(value)}>
        <ContentCopyIcon fontSize="small" />
      </Box>
    </Box>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl sx={{ width: 140 }}>
          <InputLabel>格式</InputLabel>
          <Select label="格式" value={format} onChange={(e) => setFormat(e.target.value as 'hex' | 'base62')}>
            <MenuItem value="hex">Hex</MenuItem>
            <MenuItem value="base62">Base62</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="字节数"
          type="number"
          sx={{ width: 140 }}
          value={bytes}
          onChange={(e) => setBytes(Number(e.target.value))}
        />
        <Button variant="contained" onClick={generate}>
          生成 Token
        </Button>
      </Stack>
      {tokens.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {tokens.map((t, i) => (
            <CopyRow key={i} value={t} />
          ))}
        </Paper>
      )}
    </Stack>
  );
}
