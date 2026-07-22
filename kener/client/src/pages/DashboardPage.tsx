import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useServices } from '../hooks/useServices';
import ServiceCard from '../components/ServiceCard';
import { servicesApi } from '../api/services';
import { overallStatus, ServiceStatus } from '../utils/status';

const STATUS_LABELS: Record<ServiceStatus, string> = {
  up: '正常',
  degraded: '降级',
  down: '故障',
};

const BANNER_COLOR: Record<ServiceStatus, string> = {
  up: '#e6f4ea',
  degraded: '#fef7e0',
  down: '#fce8e8',
};

export default function DashboardPage() {
  const { services, loading, error, reload } = useServices();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | ServiceStatus>('all');

  const handleProbeAll = async () => {
    await Promise.all(
      services.map((s) =>
        servicesApi.probe(s.id).catch(() => undefined)
      )
    );
    reload();
  };

  const overall: ServiceStatus = useMemo(
    () => overallStatus(services.map((s) => s.lastStatus ?? 'down')),
    [services]
  );

  const visible = useMemo(
    () =>
      filter === 'all'
        ? services
        : services.filter((s) => (s.lastStatus ?? 'down') === filter),
    [services, filter]
  );

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

      {!loading && services.length > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: BANNER_COLOR[overall],
            borderLeft: '4px solid',
            borderColor: overall === 'up' ? 'success.main' : overall === 'degraded' ? 'warning.main' : 'error.main',
          }}
        >
          <Typography fontWeight={700}>
            整体状态：{STATUS_LABELS[overall]}（共 {services.length} 个服务）
          </Typography>
        </Paper>
      )}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>按状态筛选</InputLabel>
          <Select
            label="按状态筛选"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | ServiceStatus)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="up">正常</MenuItem>
            <MenuItem value="degraded">降级</MenuItem>
            <MenuItem value="down">故障</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          显示 {visible.length} / {services.length}
        </Typography>
      </Stack>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && services.length === 0 && (
        <Alert severity="info">还没有服务，点击右上角「新增服务」开始。</Alert>
      )}
      {!loading && services.length > 0 && visible.length === 0 && (
        <Alert severity="info">当前筛选条件下没有匹配的服务。</Alert>
      )}
      {visible.map((s) => (
        <ServiceCard key={s.id} service={s} onChanged={reload} />
      ))}
    </Box>
  );
}
