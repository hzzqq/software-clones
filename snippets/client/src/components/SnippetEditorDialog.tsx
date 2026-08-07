import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import type { LanguageOption, Snippet, SnippetFormValues } from '../types';
import { LANGUAGES, languageLabel } from '../utils/highlight';
import { ApiError } from '../api/client';
import { snippetsApi } from '../api/snippets';
import { parseTags } from '../utils/tags';

interface SnippetEditorDialogProps {
  open: boolean;
  /** 传入则编辑，否则新建。 */
  snippet: Snippet | null;
  onClose: () => void;
  onSaved: (snippet: Snippet) => void;
}

const EMPTY: SnippetFormValues = {
  title: '',
  language: 'javascript',
  code: '',
  tags: '',
};

/**
 * 新建 / 编辑代码片段对话框：标题、语言、代码、标签（逗号分隔）。
 */
export default function SnippetEditorDialog({
  open,
  snippet,
  onClose,
  onSaved,
}: SnippetEditorDialogProps): JSX.Element {
  const [values, setValues] = useState<SnippetFormValues>(EMPTY);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setValues(
        snippet
          ? {
              title: snippet.title,
              language: snippet.language,
              code: snippet.code,
              tags: snippet.tags.join(', '),
            }
          : EMPTY,
      );
      setError('');
      setSaving(false);
    }
  }, [open, snippet]);

  const handleSave = async (): Promise<void> => {
    if (!values.title.trim()) {
      setError('标题不能为空');
      return;
    }
    if (!values.code.trim()) {
      setError('代码内容不能为空');
      return;
    }
    setSaving(true);
    try {
      const saved = snippet
        ? await snippetsApi.update(snippet.id, values)
        : await snippetsApi.create(values);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const tagCount = parseTags(values.tags).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{snippet ? '编辑片段' : '新建片段'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="标题"
              value={values.title}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, title: e.target.value }));
                setError('');
              }}
              sx={{ flexGrow: 1, minWidth: 240 }}
              autoFocus
            />
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="snippet-language-label">语言</InputLabel>
              <Select
                labelId="snippet-language-label"
                label="语言"
                value={values.language}
                onChange={(e) => setValues((prev) => ({ ...prev, language: e.target.value }))}
              >
                {LANGUAGES.map((lang: LanguageOption) => (
                  <MenuItem key={lang.id} value={lang.id}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TextField
            label="标签（逗号分隔，可选）"
            placeholder="js, 前端, 工具"
            value={values.tags}
            onChange={(e) => setValues((prev) => ({ ...prev, tags: e.target.value }))}
            fullWidth
            helperText={`已解析 ${tagCount} 个标签（自动小写去重）`}
          />
          <TextField
            label="代码内容"
            value={values.code}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, code: e.target.value }));
              setError('');
            }}
            fullWidth
            multiline
            minRows={10}
            maxRows={22}
            sx={{
              '& textarea': {
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: 13,
                lineHeight: 1.6,
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            当前语言：{languageLabel(values.language)}（保存后自动高亮）
          </Typography>
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
