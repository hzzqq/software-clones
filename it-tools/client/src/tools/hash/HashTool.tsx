import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { allHashes } from '../../utils/crypto';
import { copyToClipboard } from '../../utils/format';

/** Hashes a piece of text with MD5/SHA-1/SHA-256/SHA-512 (crypto-js). */
export default function HashTool(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<Record<string, string> | null>(null);

  const compute = (): void => {
    if (!input) {
      setResult(null);
      return;
    }
    setResult(allHashes(input));
  };

  const CopyRow = ({ label, value }: { label: string; value: string }): JSX.Element => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
      <Typography sx={{ width: 72, fontWeight: 600, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography className="mono" sx={{ flexGrow: 1, wordBreak: 'break-all', fontSize: 13 }}>
        {value}
      </Typography>
      <IconButton size="small" onClick={() => void copyToClipboard(value)} aria-label="copy">
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Stack spacing={2}>
      <TextField
        label="输入文本"
        multiline
        minRows={4}
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <Box>
        <Button variant="contained" onClick={compute} disabled={!input}>
          计算哈希
        </Button>
      </Box>
      {result && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <CopyRow label="MD5" value={result.md5} />
          <CopyRow label="SHA-1" value={result.sha1} />
          <CopyRow label="SHA-256" value={result.sha256} />
          <CopyRow label="SHA-512" value={result.sha512} />
        </Paper>
      )}
    </Stack>
  );
}
