import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Link,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { previewUrl, downloadUrl, type FsEntry } from '../api/filemanager';

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'json', 'js', 'ts', 'tsx', 'jsx', 'mjs', 'cjs',
  'css', 'html', 'xml', 'yml', 'yaml', 'log', 'csv', 'ini', 'env',
  'sh', 'bat', 'ps1', 'py', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'rs',
  'sql', 'toml', 'gitignore', 'editorconfig',
]);
const IMG_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'ico']);

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

interface FilePreviewProps {
  entry: FsEntry | null;
  onClose: () => void;
  onShare: (path: string) => void;
}

/** 文件预览对话框：图片 inline、文本拉取内容、其它类型引导下载。 */
export default function FilePreview({ entry, onClose, onShare }: FilePreviewProps): JSX.Element {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isImg = entry ? IMG_EXT.has(extOf(entry.name)) : false;
  const isTxt = entry ? TEXT_EXT.has(extOf(entry.name)) : false;

  useEffect(() => {
    if (!entry || !isTxt) {
      setText(null);
      return;
    }
    setLoading(true);
    setError('');
    fetch(previewUrl(entry.path))
      .then((r) => r.text())
      .then((t) => {
        setText(t);
        setLoading(false);
      })
      .catch(() => {
        setError('读取失败');
        setLoading(false);
      });
  }, [entry, isTxt]);

  return (
    <Dialog open={!!entry} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry?.name}
        </Box>
        <IconButton onClick={onClose} aria-label="关闭">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {entry && (
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Link href={downloadUrl(entry.path)} target="_blank" rel="noreferrer" underline="hover">
              下载
            </Link>
            <Button size="small" onClick={() => onShare(entry.path)}>
              分享短链
            </Button>
            <Typography variant="caption" color="text.secondary">
              {entry.size != null ? `${entry.size} B` : '目录'}
            </Typography>
          </Box>
        )}
        {entry && isImg && (
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={previewUrl(entry.path)}
              alt={entry.name}
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
            />
          </Box>
        )}
        {entry && isTxt && (loading ? <CircularProgress /> : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Box
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '70vh',
              overflow: 'auto',
              bgcolor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          >
            {text}
          </Box>
        ))}
        {entry && !isImg && !isTxt && (
          <Typography color="text.secondary">
            该类型暂不支持在线预览，请点击「下载」。
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
