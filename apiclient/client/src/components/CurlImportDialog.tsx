import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import { parseCurlCommand, type CurlDraft } from '../utils/curl';

export interface CurlImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (draft: CurlDraft) => void;
}

const SAMPLE = "curl -X POST 'https://httpbin.org/post?tag=demo' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"hello\":\"world\"}'";

/**
 * cURL 导入对话框：粘贴命令 → 实时解析预览 → 一键回填到请求编辑区。
 * 解析在输入时即时进行，非法命令只提示不落地，避免覆盖当前草稿。
 */
export default function CurlImportDialog({
  open,
  onClose,
  onImport,
}: CurlImportDialogProps): JSX.Element {
  const [text, setText] = useState('');

  const parsed: CurlDraft | null = useMemo(
    () => (text.trim() ? parseCurlCommand(text) : null),
    [text],
  );
  const invalid = text.trim().length > 0 && parsed === null;

  const handleImport = (): void => {
    if (!parsed) return;
    onImport(parsed);
    setText('');
    onClose();
  };

  const handleClose = (): void => {
    setText('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>导入 cURL 命令</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            粘贴浏览器开发者工具「Copy as cURL」或接口文档里的命令，自动填入方法、URL、参数、请求头与请求体。
          </Typography>
          <TextField
            autoFocus
            label="cURL 命令"
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={8}
            placeholder={SAMPLE}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
          />
          {invalid && <Alert severity="warning">未能从命令中解析出请求地址，请检查是否完整。</Alert>}
          {parsed && (
            <Alert severity="success">
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={parsed.method} color="primary" />
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {parsed.url}
                  </Typography>
                </Stack>
                <Typography variant="caption">
                  参数 {Object.keys(parsed.params).length} 个 · 请求头{' '}
                  {Object.keys(parsed.headers).length} 个 · 请求体 {parsed.body.length} 字符
                </Typography>
              </Stack>
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setText(SAMPLE)}>填入示例</Button>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" onClick={handleImport} disabled={!parsed}>
          导入到编辑区
        </Button>
      </DialogActions>
    </Dialog>
  );
}
