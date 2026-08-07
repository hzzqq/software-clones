import { Box, Paper, Typography } from '@mui/material';
import { formatMessageTime } from '../utils/format';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  /** 是否是自己发的（右侧高亮气泡）。 */
  isOwn: boolean;
}

/**
 * 单条消息气泡：自己的消息靠右 + 主色高亮，他人消息靠左。
 */
export default function MessageBubble({ message, isOwn }: MessageBubbleProps): JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 1.5,
      }}
    >
      <Box sx={{ maxWidth: '72%' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', px: 0.5, mb: 0.25, textAlign: isOwn ? 'right' : 'left' }}
        >
          {isOwn ? '我' : message.nickname} · {formatMessageTime(message.createdAt)}
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            px: 1.5,
            py: 1,
            bgcolor: isOwn ? 'primary.main' : 'background.paper',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
            borderColor: isOwn ? 'primary.main' : 'divider',
            borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          <Typography variant="body2">{message.content}</Typography>
        </Paper>
      </Box>
    </Box>
  );
}
