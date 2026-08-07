import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Alert,
} from '@mui/material';
import { normalizeUrl } from '../utils/shortLink';

interface CreateLinkDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { url: string; title?: string }) => Promise<{ id: number }>;
}

/**
 * 创建短链接弹窗：输入长链（可省略协议）+ 可选标题。
 * 提交前做前端校验；后端仍会再次校验并生成短码。
 */
export default function CreateLinkDialog({
  open,
  onClose,
  onCreate,
}: CreateLinkDialogProps): JSX.Element {
  const navigate = useNavigate();
  const [url, setUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setUrl('');
      setTitle('');
      setError('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (): Promise<void> => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('请输入合法的网址（仅支持 http/https）');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const link = await onCreate({ url: normalized, title: title.trim() || undefined });
      onClose();
      navigate(`/links/${link.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>创建短链接</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 1 }} onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <TextField
            autoFocus
            fullWidth
            label="原始长链接"
            placeholder="https://example.com/very/long/path"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            sx={{ mb: 2 }}
            helperText="可省略协议，将自动补全为 https://"
          />
          <TextField
            fullWidth
            label="标题（可选）"
            placeholder="例如：产品文档"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            helperText="留空则使用原始链接作为标题"
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          取消
        </Button>
        <Button variant="contained" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? '创建中…' : '生成短链'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
