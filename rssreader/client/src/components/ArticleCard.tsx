import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, Chip, Typography } from '@mui/material';
import { Article } from '../types';
import { relativeTime, stripHtml, truncate } from '../utils/format';

interface ArticleCardProps {
  article: Article;
}

/**
 * 文章列表卡片：标题 / 来源订阅 / 时间 / 摘要预览 / 已读状态。
 * 点击进入全文阅读页（进入时标为已读）。
 */
export default function ArticleCard({ article }: ArticleCardProps): JSX.Element {
  const navigate = useNavigate();
  const preview = stripHtml(article.description || article.content);

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardActionArea onClick={() => navigate(`/articles/${article.id}`)}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {!article.isRead && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  flexShrink: 0,
                }}
                aria-label="未读"
              />
            )}
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: article.isRead ? 400 : 700, flexGrow: 1 }}
            >
              {article.title}
            </Typography>
            <Chip size="small" label={article.feedTitle} variant="outlined" />
          </Box>
          {preview && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {truncate(preview, 140)}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled">
            {article.pubDate ? relativeTime(article.pubDate) : relativeTime(article.createdAt)}
            {article.author ? ` · ${article.author}` : ''}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
