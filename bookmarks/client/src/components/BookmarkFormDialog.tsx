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
} from '@mui/material';
import type { Bookmark, BookmarkFormValues, Category } from '../types';
import { ApiError } from '../api/client';
import { bookmarksApi } from '../api/bookmarks';
import { normalizeUrl } from '../utils/url';

interface BookmarkFormDialogProps {
  open: boolean;
  /** 传入则编辑，否则新建。 */
  bookmark: Bookmark | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (bookmark: Bookmark) => void;
}

const EMPTY: BookmarkFormValues = {
  url: '',
  title: '',
  description: '',
  categoryId: null,
};

/**
 * 新建 / 编辑书签对话框。校验 URL 合法性与必填项，
 * 服务端返回 409（重复收藏）时给出明确提示。
 */
export default function BookmarkFormDialog({
  open,
  bookmark,
  categories,
  onClose,
  onSaved,
}: BookmarkFormDialogProps): JSX.Element {
  const [values, setValues] = useState<BookmarkFormValues>(EMPTY);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setValues(
        bookmark
          ? {
              url: bookmark.url,
              title: bookmark.title,
              description: bookmark.description,
              categoryId: bookmark.categoryId,
            }
          : EMPTY,
      );
      setError('');
      setSaving(false);
    }
  }, [open, bookmark]);

  const handleChange = (field: keyof BookmarkFormValues, value: string | number | null): void => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async (): Promise<void> => {
    const normalized = normalizeUrl(values.url);
    if (!normalized) {
      setError('请输入有效的网址（例如 example.com 或 https://example.com）');
      return;
    }
    if (!values.title.trim()) {
      setError('标题不能为空');
      return;
    }
    setSaving(true);
    try {
      const saved = bookmark
        ? await bookmarksApi.update(bookmark.id, { ...values, url: normalized })
        : await bookmarksApi.create({ ...values, url: normalized });
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === 40901 ? '该链接已收藏，请勿重复添加' : err.message);
      } else {
        setError('保存失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{bookmark ? '编辑书签' : '添加书签'}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="网址 URL"
            placeholder="https://example.com"
            value={values.url}
            onChange={(e) => handleChange('url', e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="标题"
            value={values.title}
            onChange={(e) => handleChange('title', e.target.value)}
            fullWidth
          />
          <TextField
            label="描述（可选）"
            value={values.description}
            onChange={(e) => handleChange('description', e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <FormControl fullWidth>
            <InputLabel id="bookmark-category-label">分类（可选）</InputLabel>
            <Select
              labelId="bookmark-category-label"
              label="分类（可选）"
              value={values.categoryId === null ? '' : values.categoryId}
              onChange={(e) =>
                handleChange('categoryId', e.target.value === '' ? null : Number(e.target.value))
              }
            >
              <MenuItem value="">未分类</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
