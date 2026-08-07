import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { VaultEntry } from '../types';
import { categoryColor, categoryIcon } from '../utils/categories';
import { copyText } from '../utils/clipboard';

export interface EntryCardProps {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entry: VaultEntry) => void;
  onNotify: (message: string) => void;
}

function CopyButton({ text, label, onNotify }: { text: string; label: string; onNotify: (m: string) => void }): JSX.Element {
  const handle = async (): Promise<void> => {
    const ok = await copyText(text);
    onNotify(ok ? `${label}已复制` : '复制失败');
  };
  return (
    <Tooltip title={`复制${label}`}>
      <IconButton size="small" aria-label={`复制${label}`} onClick={handle}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export default function EntryCard({ entry, onEdit, onDelete, onNotify }: EntryCardProps): JSX.Element {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const color = categoryColor(entry.category);
  const icon = categoryIcon(entry.category);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              bgcolor: `${color}1a`,
            }}
          >
            <span role="img" aria-label={entry.category}>
              {icon}
            </span>
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
              {entry.title}
            </Typography>
            <Chip
              label={entry.category}
              size="small"
              sx={{ height: 20, fontSize: 12, color, bgcolor: `${color}1a`, mt: 0.25 }}
            />
          </Box>
        </Stack>

        <Stack spacing={1} sx={{ mt: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              用户名
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                {entry.username || '—'}
              </Typography>
              {entry.username && <CopyButton text={entry.username} label="用户名" onNotify={onNotify} />}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              密码
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography
                variant="body2"
                sx={{ flexGrow: 1, fontFamily: 'monospace', letterSpacing: showPassword ? 0 : 2 }}
                noWrap
              >
                {showPassword ? entry.password : '••••••••••••'}
              </Typography>
              <Tooltip title={showPassword ? '隐藏密码' : '显示密码'}>
                <IconButton
                  size="small"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              {entry.password && <CopyButton text={entry.password} label="密码" onNotify={onNotify} />}
            </Stack>
          </Box>

          {entry.url && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                网址
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" noWrap sx={{ flexGrow: 1, color: 'primary.main' }}>
                  {entry.url}
                </Typography>
                <Tooltip title="打开网址">
                  <IconButton
                    size="small"
                    aria-label="打开网址"
                    onClick={() => window.open(entry.url, '_blank', 'noopener,noreferrer')}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          )}

          {entry.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                备注
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {entry.notes}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(entry)}>
          编辑
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onDelete(entry)}>
          删除
        </Button>
      </CardActions>
    </Card>
  );
}
