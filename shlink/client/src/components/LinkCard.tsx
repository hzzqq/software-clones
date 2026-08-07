import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LinkIcon from '@mui/icons-material/Link';
import { ShortLink } from '../types';
import { buildShortUrl, formatClicks, formatDateTime } from '../utils/shortLink';

interface LinkCardProps {
  link: ShortLink;
  onDelete: (id: number) => Promise<void>;
}

/** 复制文本到剪贴板（带降级方案）。 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 单条短链接卡片：展示短链 / 原链 / 点击统计 / 创建时间，
 * 支持复制短链、打开原链、删除（带确认）。
 */
export default function LinkCard({ link, onDelete }: LinkCardProps): JSX.Element {
  const shortUrl = buildShortUrl(link.code);
  const [copied, setCopied] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleCopy = async (): Promise<void> => {
    const ok = await copyText(shortUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setError('复制失败，请手动选择短链复制');
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      await onDelete(link.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <LinkIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {link.title || link.url}
          </Typography>
        </Box>
        <Typography variant="body2" color="primary" sx={{ wordBreak: 'break-all' }}>
          {shortUrl}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ wordBreak: 'break-all', mt: 0.5 }}
        >
          原始链接：{link.url}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`点击 ${formatClicks(link.clicks)} 次`} color="primary" variant="outlined" />
          <Chip size="small" label={`创建于 ${formatDateTime(link.createdAt)}`} variant="outlined" />
          <Chip size="small" label={`短码 ${link.code}`} variant="outlined" />
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5 }}>
        <Tooltip title={copied ? '已复制' : '复制短链'}>
          <IconButton size="small" onClick={() => void handleCopy()} aria-label="复制短链">
            <ContentCopyIcon fontSize="small" color={copied ? 'success' : 'inherit'} />
          </IconButton>
        </Tooltip>
        <Tooltip title="打开原始链接">
          <IconButton
            size="small"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="打开原始链接"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {confirming ? (
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button size="small" color="error" variant="contained" onClick={() => void handleDelete()}>
              确认删除
            </Button>
            <Button size="small" onClick={() => setConfirming(false)}>
              取消
            </Button>
          </Box>
        ) : (
          <Tooltip title="删除短链">
            <IconButton
              size="small"
              sx={{ ml: 'auto' }}
              onClick={() => setConfirming(true)}
              aria-label="删除短链"
            >
              <DeleteOutlineIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );
}
