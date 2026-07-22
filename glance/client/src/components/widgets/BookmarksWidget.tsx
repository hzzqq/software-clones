import { Box, Chip, Link } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WidgetFrame from '../WidgetFrame';
import { BookmarksConfig, Widget } from '../../types';

interface BookmarksWidgetProps {
  widget: Widget;
  onConfigure?: () => void;
  onRemove?: () => void;
}

/** Bookmark links widget (purely local config, rendered as chips). */
export default function BookmarksWidget({
  widget,
  onConfigure,
  onRemove,
}: BookmarksWidgetProps): JSX.Element {
  const config = widget.config as BookmarksConfig;
  const items = config.items ?? [];

  return (
    <WidgetFrame
      title={widget.title}
      onConfigure={onConfigure}
      onRemove={onRemove}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {items.map((it) => (
          <Chip
            key={it.url}
            label={it.name}
            component={Link}
            href={it.url}
            target="_blank"
            rel="noreferrer"
            clickable
            icon={<OpenInNewIcon />}
            sx={{ cursor: 'pointer' }}
          />
        ))}
        {items.length === 0 && <Box sx={{ color: 'text.secondary' }}>暂无书签</Box>}
      </Box>
    </WidgetFrame>
  );
}
