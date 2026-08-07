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
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { articleApi } from '../api/articles';
import { Article } from '../types';
import { formatDateTime } from '../utils/format';
import { sanitizeHtml } from '../utils/sanitizeHtml';

/**
 * 全文阅读视图：展示清洗后的文章 HTML（防 XSS），进入时自动标为已读。
 */
export default function ArticleDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('文章 ID 不合法');
      setLoading(false);
      return;
    }
    setLoading(true);
    articleApi
      .get(numericId)
      .then((data) => {
        setArticle(data);
        setError('');
        // 打开即标为已读（失败不阻塞阅读）。
        if (!data.isRead) {
          articleApi.markRead(numericId).catch(() => {
            /* 忽略：仅更新已读状态 */
          });
        }
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

  if (error || !article) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || '文章不存在'}
      </Alert>
    );
  }

  const body = sanitizeHtml(article.content || article.description);

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/" underline="hover" color="inherit">
          全部文章
        </Link>
        <Typography color="text.primary" sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.title}
        </Typography>
      </Breadcrumbs>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            {article.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip size="small" label={article.feedTitle} color="primary" variant="outlined" />
            {article.author && <Chip size="small" label={`作者：${article.author}`} variant="outlined" />}
            <Chip
              size="small"
              label={article.pubDate ? `发布于 ${formatDateTime(article.pubDate)}` : '时间未知'}
              variant="outlined"
            />
            {article.link && (
              <Button
                size="small"
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{ ml: 'auto' }}
              >
                查看原文
              </Button>
            )}
          </Box>
          {body ? (
            <Box
              className="article-body"
              sx={{
                '& img': { maxWidth: '100%', height: 'auto' },
                '& pre': { overflowX: 'auto', bgcolor: 'action.hover', p: 1.5, borderRadius: 1 },
                '& blockquote': { borderLeft: 4, borderColor: 'divider', pl: 2, ml: 0, color: 'text.secondary' },
                '& a': { color: 'primary.main' },
                wordBreak: 'break-word',
                lineHeight: 1.8,
              }}
              // 内容已由 sanitizeHtml 清洗（白名单标签/属性、剥离脚本与事件处理器）。
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <Typography color="text.secondary">（本文无正文内容）</Typography>
          )}
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
