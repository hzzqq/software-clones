import { useCallback, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { formatBytes } from '../utils/format';

interface UploadZoneProps {
  /** 文件已就绪，由父组件执行上传。 */
  onFileSelected: (file: File) => void;
  /** 上传中状态（父组件驱动，用于展示进度）。 */
  uploading: boolean;
  /** 上传中提示文本（例如 "正在上传 xx.zip…"）。 */
  uploadingText?: string;
}

/**
 * 拖拽 / 点击两用的文件选择区。
 * 只负责「选文件」，不直接发请求，便于父组件统一管理上传状态与错误提示。
 */
export default function UploadZone({
  onFileSelected,
  uploading,
  uploadingText = '正在上传…',
}: UploadZoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const pick = useCallback(
    (files: FileList | null): void => {
      const file = files?.[0];
      if (file) {
        onFileSelected(file);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [onFileSelected]
  );

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        pick(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      sx={{
        border: '2px dashed',
        borderColor: dragOver ? 'primary.main' : 'divider',
        borderRadius: 3,
        bgcolor: dragOver ? 'action.hover' : 'background.paper',
        p: { xs: 4, md: 6 },
        textAlign: 'center',
        cursor: uploading ? 'default' : 'pointer',
        transition: 'border-color .15s, background-color .15s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        disabled={uploading}
        onChange={(e) => pick(e.target.files)}
      />
      {uploading ? (
        <>
          <CircularProgress size={40} sx={{ mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            {uploadingText}
          </Typography>
        </>
      ) : (
        <>
          <CloudUploadIcon sx={{ fontSize: 52, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            拖拽文件到此处，或点击选择文件
          </Typography>
          <Typography variant="body2" color="text.secondary">
            单个文件最大 {formatBytes(50 * 1024 * 1024)}（可在服务端配置调整）
          </Typography>
          <Button
            variant="contained"
            component="span"
            sx={{ mt: 2 }}
            startIcon={<CloudUploadIcon />}
          >
            选择文件
          </Button>
        </>
      )}
    </Box>
  );
}
