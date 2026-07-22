import { useEffect, useState } from 'react';
import { Box, TextField } from '@mui/material';
import WidgetFrame from '../WidgetFrame';
import { NotesConfig, Widget } from '../../types';

interface NotesWidgetProps {
  widget: Widget;
  onConfigure?: () => void;
  onRemove?: () => void;
  onCommit?: (text: string) => void;
}

/** Local sticky-notes widget — content is persisted via the widget config. */
export default function NotesWidget({
  widget,
  onConfigure,
  onRemove,
  onCommit,
}: NotesWidgetProps): JSX.Element {
  const config = (widget.config as NotesConfig) ?? { text: '' };
  const [text, setText] = useState<string>(config.text ?? '');

  // Keep local state in sync when the widget config is replaced externally.
  useEffect(() => {
    setText((config.text as string) ?? '');
  }, [config.text]);

  return (
    <WidgetFrame title={widget.title} onConfigure={onConfigure} onRemove={onRemove}>
      <Box sx={{ height: '100%' }}>
        <TextField
          multiline
          fullWidth
          placeholder="随手记…（内容随看板一起保存）"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onCommit?.(text)}
          sx={{ height: '100%', '& .MuiInputBase-root': { height: '100%' }, '& textarea': { height: '100% !important' } }}
        />
      </Box>
    </WidgetFrame>
  );
}
