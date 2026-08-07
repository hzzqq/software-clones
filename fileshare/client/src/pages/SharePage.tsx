import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useParams } from 'react-router-dom';
import { downloadUrl, getFileByCode } from '../api/files';
import { ApiError } from '../api/client';
import { formatBytes, formatDateTime } from '../utils/format';
import type { SharedFile } from '../types';

/**
 * 分享落地页 /s/:code：展示文件信息 + 一键下载。
 */
export default function SharePage(): JSX.Element {
  const { code = '' } = useParams<{ code: string }>();
  const [file, setFile] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await getFileByCode(code);
      setFile(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '文件不存在或已被删除');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !file) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', mt: 6 }}>
        <Alert severity="warning">{error || '文件不存在'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <InsertDriveFileIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" sx={{ wordBreak: 'break-all' }} gutterBottom>
          {file.originalName}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}
        >
          <Chip size="small" variant="outlined" label={`大小 ${formatBytes(file.size)}`} />
          <Chip size="small" variant="outlined" label={`上传于 ${formatDateTime(file.createdAt)}`} />
          <Chip size="small" variant="outlined" label={`已下载 ${file.downloadCount} 次`} />
        </Stack>
        <Button
          variant="contained"
          size="large"
          startIcon={<DownloadIcon />}
          component="a"
          href={downloadUrl(file.code)}
        >
          下载文件
        </Button>
      </Paper>
    </Box>
  );
}
