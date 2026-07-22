import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { postApi } from '../api/posts';
import { commentApi } from '../api/comments';
import type { Post, Comment, CommentNode } from '../types';
import Composer from '../components/Composer';
import CommentThread from '../components/CommentThread';
import { buildCommentTree } from '../utils/forum';

export default function PostDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tree, setTree] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, cs] = await Promise.all([postApi.get(postId), commentApi.listByPost(postId)]);
      setPost(p);
      setComments(cs);
      setTree(buildCommentTree(cs));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleLike = async () => {
    try {
      const u = await postApi.like(postId);
      setPost(u);
    } catch {
      /* ignore */
    }
  };

  const handleReply = async (parentId: number | null, body: string, author: string) => {
    try {
      await commentApi.create({ postId, parentId, body, authorName: author });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCommentLike = async (cid: number) => {
    try {
      await commentApi.like(cid);
      await load();
    } catch {
      /* ignore */
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!post) return <Alert severity="warning">帖子不存在</Alert>;

  return (
    <Box>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1, color: 'text.secondary' }}>
          <ArrowBackIcon fontSize="small" />
          <Typography variant="caption">返回广场</Typography>
        </Stack>
      </Link>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip size="small" color="secondary" label={post.channelName} />
        <Typography variant="caption" color="text.secondary">
          @{post.authorName} · {new Date(post.createdAt).toLocaleString()}
        </Typography>
      </Stack>
      <Typography variant="h5" sx={{ mt: 1 }}>
        {post.title}
      </Typography>
      <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
        {post.body}
      </Typography>
      {post.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
          {post.tags.map((t) => (
            <Chip key={t} size="small" variant="outlined" label={`#${t}`} />
          ))}
        </Stack>
      )}
      <IconButton onClick={handleLike} aria-label="点赞">
        <FavoriteBorderIcon />
      </IconButton>
      <Typography component="span" variant="caption">
        {post.likes}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Typography variant="h6" sx={{ mb: 1 }}>
        评论（{comments.length}）
      </Typography>
      <Composer placeholder="写下你的评论…" onSubmit={(body, author) => handleReply(null, body, author)} />
      <Box sx={{ mt: 1 }}>
        {tree.map((node) => (
          <CommentThread key={node.id} node={node} depth={0} onReply={handleReply} onLike={handleCommentLike} />
        ))}
      </Box>
    </Box>
  );
}
