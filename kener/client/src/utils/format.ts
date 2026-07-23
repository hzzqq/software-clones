import type { Incident } from '../types';

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
  const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : nowMs;
  return Math.max(0, Math.floor((end - start) / 1000));
}
