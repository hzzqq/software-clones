import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, Stack } from '@mui/material';
import { servicesApi } from '../api/services';
import { parseIdParam } from '../utils/params';

export default function ServiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    try {
      const serviceId = parseIdParam(id);
      if (serviceId === null) {
        setError('无效的服务 ID');
        return;
      }
      if (editing) {
        await servicesApi.update(serviceId, { name, url, description });
      } else {
        await servicesApi.create({ name, url, description });
      }
      navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    }
  };

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        {editing ? '编辑服务' : '新增服务'}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField label="名称" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
        <TextField
          label="描述"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={2}
        />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => void submit()}>
            保存
          </Button>
          <Button onClick={() => navigate('/')}>取消</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
