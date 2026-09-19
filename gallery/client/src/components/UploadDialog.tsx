import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
  Box,
} from '@mui/material';
import { uploadAsset, type Asset } from '../api/gallery';

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (assets: Asset[]) => void;
}

/** 读取图片宽高（用于回传服务端，便于后续缩略/EXIF）。 */
function readImageSize(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({});
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** 多文件上传对话框：逐张原始二进制 POST，带进度条。 */
export default function UploadDialog({ open, onClose, onUploaded }: UploadDialogProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setError('');
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      setError('请选择图片文件');
      return;
    }
    setProgress({ done: 0, total: list.length });
    const uploaded: Asset[] = [];
    for (const file of list) {
      try {
        const size = await readImageSize(file);
        const asset = await uploadAsset(file, size);
        uploaded.push(asset);
      } catch (e) {
        setError(e instanceof Error ? e.message : '上传失败');
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    if (uploaded.length > 0) onUploaded(uploaded);
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>上传图片</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => inputRef.current?.click()}
        >
          <Typography>点击选择图片（可多选）</Typography>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </Box>
        {progress && (
          <LinearProgress
            variant="determinate"
            value={(progress.done / progress.total) * 100}
            sx={{ mt: 2 }}
          />
        )}
        {progress && (
          <Typography variant="caption" color="text.secondary">
            {progress.done} / {progress.total}
          </Typography>
        )}
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
