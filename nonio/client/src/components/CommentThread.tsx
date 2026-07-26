import { useState } from 'react';
import { Box, Typography, IconButton, Stack, Button } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ReplyIcon from '@mui/icons-material/Reply';
import type { CommentNode } from '../types';
import { formatDateTime } from '../utils/forum';
import Composer from './Composer';

interface Props {
  node: CommentNode;
  depth: number;
  onReply: (parentId: number, body: string, author: string) => void;
  onLike: (id: number) => void;
}

export default function CommentThread({ node, depth, onReply, onLike }: Props): JSX.Element {
  const [replying, setReplying] = useState(false);

  return (
    <Box sx={{ pl: depth > 0 ? 3 : 0, borderLeft: depth > 0 ? '2px solid' : 'none', borderColor: 'divider', py: 0.5 }}>
      <Typography variant="body2">
        <b>@{node.authorName}</b>{' '}
        <Typography component="span" variant="caption" color="text.secondary">
          {formatDateTime(node.createdAt)}
        </Typography>
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
        {node.body}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton size="small" onClick={() => onLike(node.id)} aria-label="点赞">
          <FavoriteBorderIcon fontSize="small" />
        </IconButton>
        <Typography component="span" variant="caption">
          {node.likes}
        </Typography>
        <Button size="small" startIcon={<ReplyIcon />} onClick={() => setReplying((v) => !v)}>
          回复
        </Button>
      </Stack>
      {replying && (
        <Composer
          placeholder={`回复 @${node.authorName}…`}
          submitLabel="回复"
          multiline={false}
          onSubmit={(body, author) => {
            onReply(node.id, body, author);
            setReplying(false);
          }}
          onCancel={() => setReplying(false)}
        />
      )}
      {node.children.map((child) => (
        <CommentThread key={child.id} node={child} depth={depth + 1} onReply={onReply} onLike={onLike} />
      ))}
    </Box>
  );
}
