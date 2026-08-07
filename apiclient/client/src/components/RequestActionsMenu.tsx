import { useEffect, useState } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Autocomplete,
} from '@mui/material';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { SavedRequest } from '../types';

export interface RequestActionsMenuProps {
  anchorEl: HTMLElement | null;
  request: SavedRequest | null;
  /** 集合中已存在的文件夹名，用于下拉建议。 */
  folders: string[];
  onClose: () => void;
  onSave: (id: number, patch: { name?: string; folder?: string }) => void | Promise<void>;
  onDuplicate: (request: SavedRequest) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}

/**
 * 集合项的操作菜单：重命名 / 移动到文件夹 / 创建副本 / 删除。
 * 「重命名」与「移动」共用同一个编辑对话框（一次改完，少一次往返）。
 */
export default function RequestActionsMenu({
  anchorEl,
  request,
  folders,
  onClose,
  onSave,
  onDuplicate,
  onDelete,
}: RequestActionsMenuProps): JSX.Element {
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [folderDraft, setFolderDraft] = useState('');

  // 每次切换目标请求时重置草稿，避免把上一个条目的名字写到新条目上。
  useEffect(() => {
    setNameDraft(request?.name ?? '');
    setFolderDraft(request?.folder ?? '');
  }, [request]);

  const openEdit = (): void => {
    setEditOpen(true);
    onClose();
  };

  const handleSave = async (): Promise<void> => {
    if (!request) return;
    await onSave(request.id, { name: nameDraft.trim(), folder: folderDraft.trim() });
    setEditOpen(false);
  };

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl) && Boolean(request)} onClose={onClose}>
        <MenuItem onClick={openEdit}>
          <ListItemIcon>
            <DriveFileRenameOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>重命名 / 移动</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (request) void onDuplicate(request);
            onClose();
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>创建副本</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (request) void onDelete(request.id);
            onClose();
          }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: 'error' }}>删除</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>重命名 / 移动</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              size="small"
              label="名称"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder={request?.url ?? ''}
              fullWidth
            />
            <Autocomplete
              freeSolo
              size="small"
              options={folders}
              value={folderDraft}
              onChange={(_e, v) => setFolderDraft(v ?? '')}
              onInputChange={(_e, v) => setFolderDraft(v)}
              renderInput={(params) => (
                <TextField {...params} label="文件夹（留空为未分组）" fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => void handleSave()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
