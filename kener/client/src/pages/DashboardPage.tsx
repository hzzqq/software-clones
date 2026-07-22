import { Box, Typography, Button, CircularProgress, Alert, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import ServiceCard from '../components/ServiceCard';
import { servicesApi } from '../api/services';

export default function DashboardPage() {
  const { services, loading, error, reload } = useServices();
  const navigate = useNavigate();

  const handleProbeAll = async () => {
    for (const s of services) {
      try {
        await servicesApi.probe(s.id);
      } catch {
        // ignore individual failures
      }
    }
    reload();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          服务状态
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => void handleProbeAll()} disabled={loading}>
            全部探测
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/services/new')}
          >
            新增服务
          </Button>
        </Stack>
      </Stack>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && services.length === 0 && (
        <Alert severity="info">还没有服务，点击右上角「新增服务」开始。</Alert>
      )}
      {services.map((s) => (
        <ServiceCard key={s.id} service={s} onChanged={reload} />
      ))}
    </Box>
  );
}
