import { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import { formatBytes, formatDateTime } from '../utils/format';
import { downloadUrl, shareUrl } from '../api/files';
import type { SharedFile } from '../types';

interface FileListItemProps {
  file: SharedFile;
  onDeleted: (file: SharedFile) => void;
  onNotify: (message: string, severity: 'success' | 'error') => void;
}

/**
 * 文件列表中的一行：名称 / 大小 / 上传时间 / 下载次数 + 操作按钮。
 */
export default function FileListItem({
  file,
  onDeleted,
  onNotify,
}: FileListItemProps): JSX.Element {
  const [deleting, setDeleting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl(file.code));
      setCopied(true);
      onNotify('分享链接已复制到剪贴板', 'success');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      onNotify('复制失败，请手动复制地址栏链接', 'error');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`确定删除「${file.originalName}」吗？删除后分享链接将失效。`)) {
      return;
    }
    setDeleting(true);
    try {
      await onDeleted(file);
      onNotify('文件已删除', 'success');
    } catch {
      onNotify('删除失败，请稍后重试', 'error');
      setDeleting(false);
    }
  };

  return (
    <TableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
          {file.originalName}
        </Typography>
        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
          <Chip
            size="small"
            variant="outlined"
            label={`短码 ${file.code}`}
            sx={{ fontFamily: 'monospace', height: 22 }}
          />
        </Box>
      </TableCell>
      <TableCell>{formatBytes(file.size)}</TableCell>
      <TableCell>{formatDateTime(file.createdAt)}</TableCell>
      <TableCell>
        <Chip
          size="small"
          color={file.downloadCount > 0 ? 'primary' : 'default'}
          variant={file.downloadCount > 0 ? 'filled' : 'outlined'}
          label={`${file.downloadCount} 次`}
        />
      </TableCell>
      <TableCell align="right">
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="下载原文件">
            <IconButton
              size="small"
              component="a"
              href={downloadUrl(file.code)}
              aria-label="下载"
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={copied ? '已复制' : '复制分享链接'}>
            <IconButton size="small" onClick={() => void handleCopy()} aria-label="复制链接">
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton
              size="small"
              color="error"
              disabled={deleting}
              onClick={() => void handleDelete()}
              aria-label="删除"
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
