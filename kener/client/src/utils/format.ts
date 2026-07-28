import type { Incident, ServiceStatus } from '../types';

/**
 * 将秒数格式化为人类可读时长。
 * 例：90 -> "1分30秒"，3700 -> "1小时1分40秒"，0 -> "0秒"。
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}秒`;
  const minutes = Math.floor(s / 60);
  const sec = s % 60;
  if (minutes < 60) return sec ? `${minutes}分${sec}秒` : `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const min = minutes % 60;
  if (hours < 24) return min ? `${hours}小时${min}分` : `${hours}小时`;
  const days = Math.floor(hours / 24);
  const hr = hours % 24;
  return hr ? `${days}天${hr}小时` : `${days}天`;
}

/**
 * 计算事件已持续秒数：未解决时以 nowMs 为终点，已解决则以 resolvedAt 为终点。
 * nowMs 由调用方传入，便于测试（纯函数）。
 */
export function incidentDurationSeconds(incident: Incident, nowMs: number): number {
  const start = new Date(incident.createdAt).getTime();
  if (Number.isNaN(start)) return 0;
  const rawEnd = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : nowMs;
  // 非法 resolvedAt（非 null 但无法解析）按「仍在进行」处理，避免 formatDuration 输出 NaN天NaN小时
  const end = Number.isNaN(rawEnd) ? nowMs : rawEnd;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * 综合可用率（百分比，0-100）：
 * up=100，degraded=50，down/未知=0；取所有服务的均值并夹回 [0,100]。
 * 空列表返回 0。
 */
/**
 * 将可用率百分比映射为中文健康度标签：
 * ≥99.9→'优'，≥99→'良'，≥95→'中'，其余→'差'。
 * 纯函数，不修改入参。入参来自 uptimePercentage 的输出（0-100）。
 */
export function serviceHealthLabel(uptime: number): string {
  if (uptime >= 99.9) return '优';
  if (uptime >= 99) return '良';
  if (uptime >= 95) return '中';
  return '差';
}

/**
 * 将可用率百分比格式化为展示串："99.98%"。
 * 非法 / 非有限值 → "—"；越界值夹回 [0,100] 再显示；保留 2 位小数。
 * 用于状态页可用率精确展示（uptimePercentage 默认只取整，丢失精度）。
 */
export function formatUptime(percent: number): string {
  if (!Number.isFinite(percent)) return '—';
  const clamped = Math.max(0, Math.min(100, percent));
  const rounded = Math.round(clamped * 100) / 100;
  return `${rounded.toFixed(2)}%`;
}

export function uptimePercentage(items: { lastStatus?: ServiceStatus }[]): number {
  if (!items.length) return 0;
  const score = (s?: ServiceStatus): number => (s === 'up' ? 100 : s === 'degraded' ? 50 : 0);
  const sum = items.reduce((acc, it) => acc + score(it.lastStatus), 0);
  return Math.max(0, Math.min(100, Math.round(sum / items.length)));
}

/**
 * 将可用率百分比映射为 MUI 颜色名，供状态横幅/可用率 Chip 统一配色。
 * ≥99→success，≥90→warning，其余(含非法值)→error。提取自 DashboardPage 中重复的内联配色逻辑。
 */
export function uptimeColor(uptime: number): 'success' | 'warning' | 'error' {
  if (!Number.isFinite(uptime)) return 'error';
  if (uptime >= 99) return 'success';
  if (uptime >= 90) return 'warning';
  return 'error';
}

/**
 * 事件严重度 → 中文标签：high→高，medium→中，low→低；
 * 未知值原样返回（透传），便于兼容后端新增取值。
 */
export function incidentSeverityLabel(severity: string): string {
  if (severity === 'high') return '高';
  if (severity === 'medium') return '中';
  if (severity === 'low') return '低';
  return severity;
}

/**
 * 格式化事件时间窗口摘要：已解决显示「持续 X」，未解决显示「进行中」，
 * createdAt 不可解析时返回「时间未知」。纯函数，便于组件直接展示与测试。
 */
export function formatIncidentWindow(incident: Incident, nowMs: number): string {
  const start = new Date(incident.createdAt).getTime();
  if (Number.isNaN(start)) return '时间未知';
  const seconds = incidentDurationSeconds(incident, nowMs);
  return incident.resolvedAt ? `持续 ${formatDuration(seconds)}` : '进行中';
}

export interface StatusCounts {
  up: number;
  degraded: number;
  down: number;
}

/**
 * 按状态计数：up / degraded 分别累加；down 与未知状态均计入 down。
 * 不修改入参。
 */
export function countByStatus(items: { lastStatus?: ServiceStatus }[]): StatusCounts {
  const counts: StatusCounts = { up: 0, degraded: 0, down: 0 };
  for (const it of items) {
    const s = it.lastStatus;
    if (s === 'up') counts.up++;
    else if (s === 'degraded') counts.degraded++;
    else counts.down++;
  }
  return counts;
}

/** 事件统计概览。 */
export interface IncidentSummary {
  open: number;
  resolved: number;
  total: number;
}

/**
 * 汇总事件：进行中(resolvedAt 为 null/undefined)与已解决数量，以及总数。不修改入参。
 */
export function summarizeIncidents(incidents: Incident[]): IncidentSummary {
  let open = 0;
  let resolved = 0;
  for (const i of incidents) {
    if (i.resolvedAt == null) open++;
    else resolved++;
  }
  return { open, resolved, total: incidents.length };
}

/**
 * 平均恢复时长（秒）：仅统计已解决事件(resolvedAt 非 null/undefined)，
 * 各事件恢复秒数由 incidentDurationSeconds 计算（已含非法时间守卫，不会出现 NaN 时长）。
 * - 无任何事件 → NaN（无数据，调用方应展示『—』而非 0）。
 * - 有事件但全部进行中（无已解决）→ NaN（无法计算均值）。
 * - 已解决事件列表为空同样返回 NaN。
 * 入参来自 summarizeIncidents 的 resolved 计数；不修改入参。
 */
export function meanResolveSeconds(incidents: Incident[], nowMs: number): number {
  const resolved = incidents.filter((i) => i.resolvedAt != null);
  if (resolved.length === 0) return Number.NaN;
  let total = 0;
  for (const i of resolved) {
    total += incidentDurationSeconds(i, nowMs);
  }
  return total / resolved.length;
}
