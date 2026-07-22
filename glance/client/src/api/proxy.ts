import { apiClient } from './client';

export interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  contentSnippet?: string;
}
export interface RssFeed {
  title: string;
  items: RssItem[];
}
export interface WeatherNow {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  time: string;
}
export interface StatusResult {
  url: string;
  status: number;
  ok: boolean;
  latencyMs: number;
}

export const proxyApi = {
  rss: (url: string): Promise<RssFeed> =>
    apiClient.get<RssFeed>(`/proxy/rss?url=${encodeURIComponent(url)}`),
  weather: (lat: number, lon: number): Promise<WeatherNow> =>
    apiClient.get<WeatherNow>(`/proxy/weather?lat=${lat}&lon=${lon}`),
  status: (url: string): Promise<StatusResult> =>
    apiClient.get<StatusResult>(`/proxy/status?url=${encodeURIComponent(url)}`),
};
