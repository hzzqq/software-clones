import { useState } from 'react';
import { Box, Button, Stack, TextField } from '@mui/material';
import { Visibility } from '../types';
import VisibilitySelect from './VisibilitySelect';

interface Props {
  initial?: { content: string; visibility: Visibility };
  submitLabel?: string;
  onSubmit: (input: { content: string; visibility: Visibility }) => Promise<void> | void;
  onCancel?: () => void;
}

export default function Composer({
  initial,
  submitLabel = '发布',
  onSubmit,
  onCancel,
}: Props): JSX.Element {
  const [content, setContent] = useState(initial?.content ?? '');
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? 'private');
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit({ content: content.trim(), visibility });
      setContent('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <TextField
        fullWidth
        multiline
        minRows={3}
        placeholder="用 #标签 记录想法，@提及 同事"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
        <Box sx={{ width: 160 }}>
          <VisibilitySelect value={visibility} onChange={setVisibility} />
        </Box>
        <Button variant="contained" onClick={handle} disabled={!content.trim() || busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} disabled={busy}>
            取消
          </Button>
        )}
      </Stack>
    </Box>
  );
}
