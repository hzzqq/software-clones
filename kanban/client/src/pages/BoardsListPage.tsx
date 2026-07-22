import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { boardsApi } from '../api/boards';
import { ApiError } from '../api/client';
import { Board } from '../types';

/** Lists all boards and lets the user create a new one. */
export default function BoardsListPage(): JSX.Element {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [name, setName] = useState<string>('');

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const data: Board[] = await boardsApi.list();
      setBoards(data);
      setError('');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (): Promise<void> => {
    if (!name.trim()) return;
    try {
      const board: Board = await boardsApi.create(name.trim());
      navigate(`/boards/${board.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        我的看板
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="新看板名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void create();
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => void create()}>
          创建
        </Button>
      </Stack>
      <Stack spacing={1}>
        {boards.map((b) => (
          <Card key={b.id}>
            <CardActionArea onClick={() => navigate(`/boards/${b.id}`)}>
              <CardContent>{b.name}</CardContent>
            </CardActionArea>
          </Card>
        ))}
        {boards.length === 0 && (
          <Typography color="text.secondary">还没有看板，先创建一个吧。</Typography>
        )}
      </Stack>
    </Box>
  );
}
