import { useState } from 'react';
import { Button, Paper, Stack, TextField } from '@mui/material';
import { diffLines, Change } from 'diff';
import { copyToClipboard } from '../../utils/format';

/** Computes a line-by-line diff between two texts. */
export default function DiffTool(): JSX.Element {
  const [left, setLeft] = useState<string>('hello world\nfoo bar');
  const [right, setRight] = useState<string>('hello world\nfoo baz');
  const [changes, setChanges] = useState<Change[]>([]);

  const compute = (): void => {
    setChanges(diffLines(left, right));
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label="原始文本"
          multiline
          minRows={6}
          fullWidth
          value={left}
          onChange={(e) => setLeft(e.target.value)}
          className="mono"
        />
        <TextField
          label="对比文本"
          multiline
          minRows={6}
          fullWidth
          value={right}
          onChange={(e) => setRight(e.target.value)}
          className="mono"
        />
      </Stack>
      <Button variant="contained" onClick={compute}>
        对比
      </Button>
      {changes.length > 0 && (
        <Paper variant="outlined" sx={{ p: 0, overflow: 'hidden' }}>
          <pre className="mono" style={{ margin: 0, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap' }}>
            {changes.map((part, i) => (
              <span
                key={i}
                style={{
                  display: 'block',
                  backgroundColor: part.added ? '#e6ffed' : part.removed ? '#ffeef0' : 'transparent',
                  color: part.added ? '#1a7f37' : part.removed ? '#cf222e' : 'inherit',
                }}
              >
                {(part.added ? '+ ' : part.removed ? '- ' : '  ') + part.value}
              </span>
            ))}
          </pre>
          <Button size="small" sx={{ m: 1 }} onClick={() => void copyToClipboard(changes.map((c) => c.value).join(''))}>
            复制全部
          </Button>
        </Paper>
      )}
    </Stack>
  );
}
