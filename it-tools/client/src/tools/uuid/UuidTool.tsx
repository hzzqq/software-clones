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
import { copyToClipboard } from '../../utils/format';
import { generateUuid } from '../../utils/tools';

/** Generates one or many UUIDs using the Web Crypto API. */
export default function UuidTool(): JSX.Element {
  const [count, setCount] = useState<number>(5);
  const [list, setList] = useState<string[]>([]);

  const generate = (): void => {
    const n: number = Math.max(1, Math.min(100, count || 1));
    const items: string[] = [];
    for (let i = 0; i < n; i++) {
      items.push(generateUuid());
    }
    setList(items);
  };

  const CopyRow = ({ value }: { value: string }): JSX.Element => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
      <Typography className="mono" sx={{ flexGrow: 1, fontSize: 13 }}>
        {value}
      </Typography>
      <IconButton size="small" onClick={() => void copyToClipboard(value)} aria-label="copy">
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="数量"
          type="number"
          sx={{ width: 140 }}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
        <Button variant="contained" onClick={generate}>
          生成 UUID
        </Button>
      </Box>
      {list.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {list.map((u, i) => (
            <CopyRow key={i} value={u} />
          ))}
        </Paper>
      )}
    </Stack>
  );
}
