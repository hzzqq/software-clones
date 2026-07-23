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
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useServices } from '../hooks/useServices';
import ServiceCard from '../components/ServiceCard';
import { servicesApi } from '../api/services';
import { incidentsApi } from '../api/incidents';
import { formatDuration, incidentDurationSeconds, uptimePercentage, countByStatus } from '../utils/format';
import { overallStatus, statusLabel, ServiceStatus } from '../utils/status';
import type { Incident } from '../types';

const STATUS_RANK: Record<ServiceStatus, number> = { down: 0, degraded: 1, up: 2 };

const BANNER_COLOR: Record<ServiceStatus, string> = {
  up: '#e6f4ea',
  degraded: '#fef7e0',
  down: '#fce8e8',
};

type SortKey = 'severity' | 'name' | 'latency';

export default function DashboardPage() {
  const { services, loading, error, reload } = useServices();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | ServiceStatus>('all');
  const [sort, setSort] = useState<SortKey>('severity');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const handleProbeAll = async (): Promise<void> => {
    await Promise.all(services.map((s) => servicesApi.probe(s.id).catch(() => undefined)));
    reload();
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => void handleProbeAll(), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  useEffect(() => {
    incidentsApi
      .list()
      .then(setIncidents)
      .catch(() => setIncidents([]));
  }, []);

  const overall: ServiceStatus = useMemo(
    () => overallStatus(services.map((s) => s.lastStatus ?? 'down')),
    [services]
  );

  const statusCounts = countByStatus(services);

  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? services : services.filter((s) => (s.lastStatus ?? 'down') === filter);
    const sorted = [...filtered];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'latency')
      sorted.sort((a, b) => (a.latencyMs ?? Infinity) - (b.latencyMs ?? Infinity));
    else sorted.sort((a, b) => STATUS_RANK[a.lastStatus ?? 'down'] - STATUS_RANK[b.lastStatus ?? 'down']);
    return sorted;
  }, [services, filter, sort]);

  const openIncidents = incidents.filter((i) => i.resolvedAt === null);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          服务状态
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
            label="自动刷新(30s)"
          />
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
            borderColor:
              overall === 'up' ? 'success.main' : overall === 'degraded' ? 'warning.main' : 'error.main',
          }}
        >
          <Typography fontWeight={700}>
            整体状态：{statusLabel(overall)}（共 {services.length} 个服务）
          </Typography>
          <Chip
            size="small"
            sx={{ mt: 1 }}
            color={uptimePercentage(services) >= 99 ? 'success' : uptimePercentage(services) >= 90 ? 'warning' : 'error'}
            label={`综合可用率 ${uptimePercentage(services)}%`}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip size="small" variant="outlined" color="success" label={`正常 ${statusCounts.up}`} />
            <Chip size="small" variant="outlined" color="warning" label={`降级 ${statusCounts.degraded}`} />
            <Chip size="small" variant="outlined" color="error" label={`故障 ${statusCounts.down}`} />
          </Stack>
        </Paper>
      )}

      {openIncidents.length > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderLeft: '4px solid',
            borderColor: 'error.main',
            bgcolor: '#fce8e8',
          }}
        >
          <Typography fontWeight={700} gutterBottom>
            进行中的事件（{openIncidents.length}）
          </Typography>
          <Stack spacing={1}>
            {openIncidents.map((inc) => (
              <Box key={inc.id}>
                <Typography variant="body2">{inc.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {inc.status} · 已持续{' '}
                  {formatDuration(incidentDurationSeconds(inc, Date.now()))}
                </Typography>
              </Box>
            ))}
          </Stack>
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>排序</InputLabel>
          <Select label="排序" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <MenuItem value="severity">按严重程度</MenuItem>
            <MenuItem value="name">按名称</MenuItem>
            <MenuItem value="latency">按延迟</MenuItem>
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
