export interface WeatherNow {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  time: string;
}

interface CacheEntry {
  value: WeatherNow;
  expires: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * Fetches current weather from Open-Meteo (no API key required) on the
 * server. Cached in memory for `TTL_MS`.
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherNow> {
  const key: string = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const now: number = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    return hit.value;
  }

  const url: string = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo 请求失败：${res.status}`);
  }
  const data = (await res.json()) as {
    current_weather?: { temperature: number; weathercode: number; windspeed: number; time: string };
  };
  const cw = data.current_weather;
  if (!cw) {
    throw new Error('Open-Meteo 返回格式异常');
  }

  const result: WeatherNow = {
    temperature: cw.temperature,
    weatherCode: cw.weathercode,
    windSpeed: cw.windspeed,
    time: cw.time,
  };
  cache.set(key, { value: result, expires: now + TTL_MS });
  return result;
}

/** Maps an Open-Meteo weather code to a short human label. */
export function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: '晴',
    1: '大致晴朗',
    2: '局部多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '毛毛雨',
    55: '大毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨',
    95: '雷阵雨',
    96: '雷阵雨伴冰雹',
    99: '强雷阵雨伴冰雹',
  };
  return map[code] ?? `代码 ${code}`;
}
