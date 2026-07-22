import { useState } from 'react';
import { Box, TextField, Button, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface Props {
  placeholder?: string;
  submitLabel?: string;
  multiline?: boolean;
  onSubmit: (body: string, authorName: string) => void;
  onCancel?: () => void;
}

export default function Composer({
  placeholder = '说点什么…',
  submitLabel = '发布',
  multiline = true,
  onSubmit,
  onCancel,
}: Props): JSX.Element {
  const [body, setBody] = useState('');
  const [author, setAuthor] = useState('');

  const handle = () => {
    if (!body.trim()) return;
    onSubmit(body.trim(), author.trim() || '匿名');
    setBody('');
  };

  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        fullWidth
        size="small"
        label="昵称（可选）"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        sx={{ mb: 1 }}
      />
      <TextField
        fullWidth
        size="small"
        multiline={multiline}
        minRows={multiline ? 3 : 1}
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button variant="contained" startIcon={<SendIcon />} onClick={handle} disabled={!body.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="text" onClick={onCancel}>
            取消
          </Button>
        )}
      </Stack>
    </Box>
  );
}
