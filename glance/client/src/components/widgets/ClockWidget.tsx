import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import WidgetFrame from '../WidgetFrame';
import { ClockConfig, Widget } from '../../types';

interface ClockWidgetProps {
  widget: Widget;
  onConfigure?: () => void;
  onRemove?: () => void;
}

/** Local clock widget (uses the browser's current time). */
export default function ClockWidget({
  widget,
  onConfigure,
  onRemove,
}: ClockWidgetProps): JSX.Element {
  const config = widget.config as ClockConfig;
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = (): void => setNow(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <WidgetFrame title={widget.title} onConfigure={onConfigure} onRemove={onRemove}>
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h3" fontWeight={700} className="mono">
          {now || '--:--:--'}
        </Typography>
        {config.timezone && (
          <Typography variant="caption" color="text.secondary">
            {config.timezone}
          </Typography>
        )}
      </Box>
    </WidgetFrame>
  );
}
