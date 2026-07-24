import { Card, CardContent, Typography, Chip, Stack, IconButton, Box } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CommentOutlinedIcon from '@mui/icons-material/CommentOutlined';
import { Link as RouterLink } from 'react-router-dom';
import type { Post } from '../types';
import { excerpt, postReadingTime, formatRelativeTime } from '../utils/forum';

interface Props {
  post: Post;
  onLike: (id: number) => void;
}

export default function PostCard({ post, onLike }: Props): JSX.Element {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Chip size="small" color="secondary" label={post.channelName} />
          <Typography variant="caption" color="text.secondary">
            @{post.authorName} · {formatRelativeTime(post.createdAt) || '未知时间'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            约 {postReadingTime(post.body)} 分钟阅读
          </Typography>
        </Stack>
        <Typography
          variant="h6"
          component={RouterLink}
          to={`/posts/${post.id}`}
          sx={{ textDecoration: 'none', color: 'text.primary', '&:hover': { color: 'primary.main' } }}
        >
          {post.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
          {excerpt(post.body)}
        </Typography>
        {post.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {post.tags.map((t) => (
              <Chip key={t} size="small" variant="outlined" label={`#${t}`} />
            ))}
          </Stack>
        )}
        <Box sx={{ mt: 1 }}>
          <IconButton size="small" onClick={() => onLike(post.id)} aria-label="点赞">
            <FavoriteBorderIcon fontSize="small" />
          </IconButton>
          <Typography component="span" variant="caption" sx={{ mr: 2 }}>
            {post.likes}
          </Typography>
          <CommentOutlinedIcon fontSize="small" />
          <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
            {post.commentCount}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
