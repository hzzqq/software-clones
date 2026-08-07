import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { useNavigate } from 'react-router-dom';
import { createRoom, listRooms } from '../api/rooms';
import { ApiError } from '../api/client';
import CreateRoomDialog from '../components/CreateRoomDialog';
import type { Room } from '../types';

/**
 * 房间列表页：展示全部房间（默认大厅），支持创建房间。
 */
export default function RoomsPage(): JSX.Element {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await listRooms();
      setRooms(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载房间列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(
    async (name: string): Promise<void> => {
      const room = await createRoom(name);
      setRooms((prev) => [room, ...prev]);
      navigate(`/rooms/${room.id}`);
    },
    [navigate]
  );

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            房间列表
          </Typography>
          <Typography variant="body2" color="text.secondary">
            选择一个房间进入聊天，或创建一个新房间。
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          创建房间
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography color="text.secondary">正在加载…</Typography>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <MeetingRoomIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">还没有房间，创建一个开始聊天吧。</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card variant="outlined">
                <CardActionArea onClick={() => navigate(`/rooms/${room.id}`)}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 0.5, wordBreak: 'break-all' }}>
                      {room.name}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${room.messageCount} 条消息`}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <CreateRoomDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </Box>
  );
}
