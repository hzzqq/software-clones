import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { Category } from '../types';
import { ApiError } from '../api/client';
import { categoriesApi } from '../api/categories';

interface CategoryManagerDialogProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onChanged: (categories: Category[]) => void;
}

/**
 * 分类管理对话框：新增 / 重命名 / 删除分类（删除后其下书签变为未分类）。
 */
export default function CategoryManagerDialog({
  open,
  categories,
  onClose,
  onChanged,
}: CategoryManagerDialogProps): JSX.Element {
  const [newName, setNewName] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const reload = async (): Promise<void> => {
    const list = await categoriesApi.list();
    onChanged(list);
  };

  const handleAdd = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) {
      setError('分类名称不能为空');
      return;
    }
    try {
      await categoriesApi.create(name);
      setNewName('');
      setError('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败');
    }
  };

  const handleRename = async (id: number): Promise<void> => {
    const name = editingName.trim();
    if (!name) {
      setError('分类名称不能为空');
      return;
    }
    try {
      await categoriesApi.rename(id, name);
      setEditingId(null);
      setError('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重命名失败');
    }
  };

  const handleDelete = async (category: Category): Promise<void> => {
    const confirmed = window.confirm(
      `删除分类「${category.name}」？其下 ${category.bookmarkCount} 条书签将变为未分类。`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await categoriesApi.remove(category.id);
      setError('');
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>分类管理</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="新分类名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
            }}
            fullWidth
            size="small"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            添加
          </Button>
        </Box>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <List dense disablePadding>
          {categories.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              还没有分类，先添加一个吧。
            </Typography>
          ) : (
            categories.map((category) => (
              <ListItem
                key={category.id}
                secondaryAction={
                  editingId === category.id ? (
                    <>
                      <IconButton
                        edge="end"
                        aria-label="保存"
                        color="primary"
                        onClick={() => void handleRename(category.id)}
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="取消" onClick={() => setEditingId(null)}>
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton
                        edge="end"
                        aria-label="重命名"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                      >
                        <EditOutlinedIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="删除"
                        color="error"
                        onClick={() => void handleDelete(category)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </>
                  )
                }
              >
                {editingId === category.id ? (
                  <TextField
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    size="small"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleRename(category.id);
                    }}
                  />
                ) : (
                  <ListItemText
                    primary={category.name}
                    secondary={`${category.bookmarkCount} 条书签`}
                  />
                )}
              </ListItem>
            ))
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>完成</Button>
      </DialogActions>
    </Dialog>
  );
}
