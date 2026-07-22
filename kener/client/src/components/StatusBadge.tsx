import { Chip } from '@mui/material';
import type { ServiceStatus } from '../types';

const MAP: Record<ServiceStatus, { label: string; color: 'success' | 'warning' | 'error' }> = {
  up: { label: '正常', color: 'success' },
  degraded: { label: '降级', color: 'warning' },
  down: { label: '故障', color: 'error' },
};

export default function StatusBadge({ status }: { status: ServiceStatus }) {
  const m = MAP[status];
  return <Chip size="small" color={m.color} label={m.label} />;
}
