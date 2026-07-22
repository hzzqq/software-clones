import { ReactNode } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';

interface WidgetFrameProps {
  title: string;
  onRefresh?: () => void;
  onConfigure?: () => void;
  onRemove?: () => void;
  children: ReactNode;
}

/**
 * Frame around every widget: a draggable header (class `widget-drag-handle`,
 * honored by react-grid-layout) plus refresh / configure / remove actions.
 */
export default function WidgetFrame({
  title,
  onRefresh,
  onConfigure,
  onRemove,
  children,
}: WidgetFrameProps): JSX.Element {
  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'inherit',
      }}
    >
      <Box
        className="widget-drag-handle"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          cursor: 'grab',
        }}
      >
        <Typography noWrap fontWeight={600} sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {onRefresh && (
          <IconButton size="small" onClick={onRefresh} aria-label="refresh">
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
        {onConfigure && (
          <IconButton size="small" onClick={onConfigure} aria-label="configure">
            <SettingsIcon fontSize="small" />
          </IconButton>
        )}
        {onRemove && (
          <IconButton size="small" onClick={onRemove} aria-label="remove">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box sx={{ p: 1.5, overflowY: 'auto', flexGrow: 1 }}>{children}</Box>
    </Paper>
  );
}
