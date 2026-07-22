import { Card, CardContent, Typography, Box, IconButton, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import type { Service } from '../types';
import StatusBadge from './StatusBadge';
import { servicesApi } from '../api/services';

export default function ServiceCard({
  service,
  onChanged,
}: {
  service: Service;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const status = service.lastStatus ?? 'down';

  const handleProbe = async () => {
    try {
      await servicesApi.probe(service.id);
    } finally {
      onChanged();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`删除服务「${service.name}」？`)) return;
    await servicesApi.remove(service.id);
    onChanged();
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography
              fontWeight={700}
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/services/${service.id}/edit`)}
            >
              {service.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {service.url}
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <StatusBadge status={status} />
            <IconButton size="small" onClick={() => void handleProbe()} title="立即探测">
              <RefreshIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => void handleDelete()} title="删除">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
        {service.latencyMs != null && (
          <Typography variant="caption" color="text.secondary">
            延迟 {service.latencyMs}ms
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
