import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import WidgetFrame from '../WidgetFrame';
import { proxyApi, WeatherNow } from '../../api/proxy';
import { WeatherConfig, Widget } from '../../types';

interface WeatherWidgetProps {
  widget: Widget;
  onConfigure?: () => void;
  onRemove?: () => void;
}

const CODE_TEXT: Record<number, string> = {
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
};

function codeToText(code: number): string {
  return CODE_TEXT[code] ?? `代码 ${code}`;
}

/** Current-weather widget (Open-Meteo via backend proxy, no API key). */
export default function WeatherWidget({
  widget,
  onConfigure,
  onRemove,
}: WeatherWidgetProps): JSX.Element {
  const config = widget.config as WeatherConfig;
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const load = async (): Promise<void> => {
    if (Number.isNaN(config.lat) || Number.isNaN(config.lon)) return;
    setLoading(true);
    setError('');
    try {
      const w: WeatherNow = await proxyApi.weather(config.lat, config.lon);
      setWeather(w);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.lat, config.lon]);

  return (
    <WidgetFrame
      title={widget.title}
      onRefresh={() => void load()}
      onConfigure={onConfigure}
      onRemove={onRemove}
    >
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ my: 1 }}>
          {error}
        </Alert>
      )}
      {weather && (
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <Typography variant="h3" fontWeight={700}>
            {Math.round(weather.temperature)}°
          </Typography>
          <Typography color="text.secondary">{codeToText(weather.weatherCode)}</Typography>
          <Typography variant="caption" color="text.secondary">
            风速 {weather.windSpeed} m/s
          </Typography>
        </Box>
      )}
    </WidgetFrame>
  );
}
