import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { deleteFile, listFiles, uploadFile } from '../api/files';
import { ApiError } from '../api/client';
import UploadZone from '../components/UploadZone';
import FileListItem from '../components/FileListItem';
import type { SharedFile } from '../types';

/**
 * 文件列表主页：上传 + 列表 + 删除 + 复制链接，核心操作闭环。
 */
export default function HomePage(): JSX.Element {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadingText, setUploadingText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null
  );

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await listFiles();
      setFiles(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleFileSelected = useCallback(
    async (file: File): Promise<void> => {
      setUploading(true);
      setUploadingText(`正在上传「${file.name}」…`);
      setError('');
      try {
        const uploaded = await uploadFile(file);
        setSnackbar({ message: `「${uploaded.originalName}」上传成功`, severity: 'success' });
        await refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '上传失败，请稍后重试');
      } finally {
        setUploading(false);
        setUploadingText('');
      }
    },
    [refresh]
  );

  const handleDeleted = useCallback(
    async (file: SharedFile): Promise<void> => {
      await deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    },
    []
  );

  const handleNotify = useCallback(
    (message: string, severity: 'success' | 'error'): void => {
      setSnackbar({ message, severity });
    },
    []
  );

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
        文件分享
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        上传文件生成分享链接，任何人打开链接即可下载。
      </Typography>

      <UploadZone
        onFileSelected={(f) => void handleFileSelected(f)}
        uploading={uploading}
        uploadingText={uploadingText}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mt: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>文件</TableCell>
                <TableCell>大小</TableCell>
                <TableCell>上传时间</TableCell>
                <TableCell>下载次数</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    正在加载…
                  </TableCell>
                </TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">还没有分享任何文件，先上传一个吧。</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    onDeleted={handleDeleted}
                    onNotify={handleNotify}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={2600}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar?.severity ?? 'success'}
          variant="filled"
          onClose={() => setSnackbar(null)}
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
