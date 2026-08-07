import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { linkApi } from '../api/links';
import { ShortLink } from '../types';
import { buildShortUrl, formatClicks, formatDateTime } from '../utils/shortLink';

/**
 * 单条短链接详情页：完整展示原链、短链、点击统计与创建时间。
 */
export default function LinkDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<ShortLink | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('链接 ID 不合法');
      setLoading(false);
      return;
    }
    setLoading(true);
    linkApi
      .get(numericId)
      .then((data) => {
        setLink(data);
        setError('');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !link) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || '短链接不存在'}
      </Alert>
    );
  }

  const shortUrl = buildShortUrl(link.code);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" underline="hover" color="inherit">
          全部短链
        </Link>
        <Typography color="text.primary">{link.code}</Typography>
      </Breadcrumbs>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            {link.title || link.url}
          </Typography>
          <Typography variant="body1" color="primary" sx={{ wordBreak: 'break-all', mb: 1 }}>
            短链：{shortUrl}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all', mb: 2 }}>
            原始链接：{link.url}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`点击 ${formatClicks(link.clicks)} 次`} color="primary" />
            <Chip label={`创建于 ${formatDateTime(link.createdAt)}`} variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ mt: 2 }}>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} color="inherit">
          返回列表
        </Button>
      </Box>
    </Box>
  );
}
