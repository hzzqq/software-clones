import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import BadgeIcon from '@mui/icons-material/Badge';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import { getMessages, postMessage, streamUrl } from '../api/rooms';
import { ApiError } from '../api/client';
import MessageBubble from '../components/MessageBubble';
import NicknameDialog from '../components/NicknameDialog';
import { loadNickname, saveNickname } from '../utils/nickname';
import type { Message } from '../types';

/**
 * 房间聊天页：SSE 实时接收新消息 + 历史消息加载 + 发送。
 */
export default function RoomPage(): JSX.Element {
  const { id: rawId = '' } = useParams<{ id: string }>();
  const roomId: number = Number(rawId);
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string>(() => loadNickname());
  const [nicknameOpen, setNicknameOpen] = useState<boolean>(() => !loadNickname());
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollAtBottomRef = useRef<boolean>(true);

  const myNickname = useMemo(() => nickname, [nickname]);

  // 加载历史消息
  useEffect(() => {
    if (!Number.isInteger(roomId) || roomId <= 0) {
      setError('房间 ID 不合法');
      return;
    }
    setError('');
    getMessages(roomId, 50)
      .then((data) => setMessages(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : '加载消息失败'));
  }, [roomId]);

  // SSE 实时流
  useEffect(() => {
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return;
    }
    const source = new EventSource(streamUrl(roomId));
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; message: Message };
        if (payload.type === 'message' && payload.message) {
          setMessages((prev) => [...prev, payload.message]);
        }
      } catch {
        /* 忽略畸形事件 */
      }
    };
    source.onerror = () => {
      // EventSource 断线会自动重连；仅在连接未建立时提示。
      if (source.readyState === EventSource.CLOSED) {
        setError('实时连接已断开，请刷新页面重试');
      }
    };
    return () => source.close();
  }, [roomId]);

  // 自动滚动到底部（用户未主动上翻时）
  useEffect(() => {
    const el = bottomRef.current;
    if (el && scrollAtBottomRef.current) {
      el.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget;
    scrollAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = useCallback(async (): Promise<void> => {
    const content = draft.trim();
    if (!content || !myNickname || sending) {
      return;
    }
    setSending(true);
    try {
      await postMessage(roomId, myNickname, content);
      setDraft('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }, [draft, myNickname, roomId, sending]);

  const handleNicknameSubmit = useCallback((value: string): void => {
    setNickname(value);
    saveNickname(value);
    setNicknameOpen(false);
  }, []);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error || '房间不存在'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Tooltip title="返回房间列表">
          <IconButton size="small" onClick={() => navigate('/rooms')} aria-label="返回">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          房间 #{roomId}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<BadgeIcon />}
          onClick={() => setNicknameOpen(true)}
        >
          {myNickname || '设置昵称'}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper
        variant="outlined"
        onScroll={handleScroll}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: 'background.default',
          minHeight: 200,
        }}
      >
        {messages.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 6 }}>
            还没有消息，来说第一句吧。
          </Typography>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.nickname === myNickname} />
          ))
        )}
        <div ref={bottomRef} />
      </Paper>

      <Paper variant="outlined" sx={{ mt: 1, p: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="输入消息，回车发送"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="contained"
                  size="small"
                  disabled={!draft.trim() || sending || !myNickname}
                  onClick={() => void handleSend()}
                  startIcon={<SendIcon />}
                >
                  发送
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <NicknameDialog
        open={nicknameOpen}
        initialValue={myNickname}
        onSubmit={handleNicknameSubmit}
        title={myNickname ? '修改昵称' : '设置你的昵称'}
        submitLabel={myNickname ? '保存' : '进入聊天'}
      />
    </Box>
  );
}
