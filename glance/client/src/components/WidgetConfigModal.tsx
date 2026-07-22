import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  BookmarkItem,
  ClockConfig,
  NotesConfig,
  RssConfig,
  StatusConfig,
  StatusItem,
  WeatherConfig,
  Widget,
  WidgetConfig,
  WidgetLayout,
  WidgetType,
} from '../types';
import { CreateWidgetInput, UpdateWidgetInput } from '../api/widgets';

interface WidgetConfigModalProps {
  open: boolean;
  /** Editing target; `null`/`undefined` means creating a new widget. */
  widget?: Widget | null;
  onCreate: (input: CreateWidgetInput) => Promise<void>;
  onUpdate: (id: number, patch: UpdateWidgetInput) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onClose: () => void;
}

const TYPE_LABELS: Record<WidgetType, string> = {
  rss: 'RSS 订阅',
  weather: '天气',
  bookmarks: '书签',
  status: '状态监控',
  clock: '时钟',
  notes: '便签',
};

const DEFAULT_LAYOUT: WidgetLayout = { x: 0, y: 0, w: 4, h: 4 };

/** Default config for each widget type (used when creating / switching type). */
function defaultConfig(type: WidgetType): WidgetConfig {
  switch (type) {
    case 'rss':
      return { url: '', maxItems: 10 } as RssConfig;
    case 'weather':
      return { lat: 0, lon: 0, label: '' } as WeatherConfig;
    case 'bookmarks':
      return { items: [] } as { items: BookmarkItem[] };
    case 'status':
      return { items: [] } as StatusConfig;
    case 'clock':
      return { timezone: '', format: 'HH:mm:ss' } as ClockConfig;
    case 'notes':
      return { text: '' } as NotesConfig;
    default:
      return { timezone: '', format: 'HH:mm:ss' } as ClockConfig;
  }
}

/** Parses a `name,url` per-line text into bookmark items. */
function parseBookmarks(text: string): BookmarkItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url] = line.split(',').map((s) => s.trim());
      return { name: name || url || '链接', url: url || name || '' };
    });
}

/** Serializes bookmark items back to `name,url` per-line text. */
function bookmarksToText(items: BookmarkItem[]): string {
  return items.map((i) => `${i.name},${i.url}`).join('\n');
}

/** Parses a `name,url,expectedStatus` per-line text into status items. */
function parseStatus(text: string): StatusItem[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url, exp] = line.split(',').map((s) => s.trim());
      const parsed = exp ? Number(exp) : NaN;
      return {
        name: name || url || '服务',
        url: url || '',
        expectedStatus: Number.isFinite(parsed) ? parsed : undefined,
      };
    });
}

/** Serializes status items back to `name,url,expectedStatus` per-line text. */
function statusToText(items: StatusItem[]): string {
  return items.map((i) => `${i.name},${i.url},${i.expectedStatus ?? ''}`).join('\n');
}

interface ConfigEditorProps {
  type: WidgetType;
  config: WidgetConfig;
  onChange: (config: WidgetConfig) => void;
}

/** Renders the type-specific configuration fields. */
function ConfigEditor({ type, config, onChange }: ConfigEditorProps): JSX.Element {
  switch (type) {
    case 'rss': {
      const c = config as RssConfig;
      return (
        <Stack spacing={2}>
          <TextField
            label="RSS 地址"
            fullWidth
            value={c.url ?? ''}
            onChange={(e) => onChange({ ...c, url: e.target.value })}
          />
          <TextField
            label="最大条数"
            type="number"
            value={c.maxItems ?? 10}
            onChange={(e) => onChange({ ...c, maxItems: Number(e.target.value) })}
          />
        </Stack>
      );
    }
    case 'weather': {
      const c = config as WeatherConfig;
      return (
        <Stack spacing={2}>
          <TextField
            label="纬度 lat"
            type="number"
            value={c.lat ?? 0}
            onChange={(e) => onChange({ ...c, lat: Number(e.target.value) })}
          />
          <TextField
            label="经度 lon"
            type="number"
            value={c.lon ?? 0}
            onChange={(e) => onChange({ ...c, lon: Number(e.target.value) })}
          />
          <TextField
            label="标签（可选）"
            fullWidth
            value={c.label ?? ''}
            onChange={(e) => onChange({ ...c, label: e.target.value })}
          />
        </Stack>
      );
    }
    case 'bookmarks': {
      const c = config as { items: BookmarkItem[] };
      return (
        <TextField
          label="书签（每行 name,url）"
          multiline
          minRows={3}
          fullWidth
          value={bookmarksToText(c.items ?? [])}
          onChange={(e) => onChange({ items: parseBookmarks(e.target.value) })}
        />
      );
    }
    case 'status': {
      const c = config as StatusConfig;
      return (
        <TextField
          label="监控项（每行 name,url,期望状态码）"
          multiline
          minRows={3}
          fullWidth
          value={statusToText(c.items ?? [])}
          onChange={(e) => onChange({ items: parseStatus(e.target.value) })}
        />
      );
    }
    case 'clock': {
      const c = config as ClockConfig;
      return (
        <Stack spacing={2}>
          <TextField
            label="时区（可选，如 Asia/Shanghai）"
            fullWidth
            value={c.timezone ?? ''}
            onChange={(e) => onChange({ ...c, timezone: e.target.value })}
          />
          <TextField
            label="格式（可选，如 HH:mm:ss）"
            fullWidth
            value={c.format ?? ''}
            onChange={(e) => onChange({ ...c, format: e.target.value })}
          />
        </Stack>
      );
    }
    case 'notes': {
      const c = config as NotesConfig;
      return (
        <TextField
          label="便签内容"
          multiline
          minRows={4}
          fullWidth
          value={c.text ?? ''}
          onChange={(e) => onChange({ ...c, text: e.target.value })}
        />
      );
    }
    default:
      return <Box />;
  }
}

/** Add / edit / delete widget modal. */
export default function WidgetConfigModal({
  open,
  widget,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: WidgetConfigModalProps): JSX.Element {
  const [type, setType] = useState<WidgetType>('rss');
  const [title, setTitle] = useState<string>('');
  const [layout, setLayout] = useState<WidgetLayout>(DEFAULT_LAYOUT);
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig('rss'));
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Reset the draft whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return;
    if (widget) {
      setType(widget.type);
      setTitle(widget.title);
      setLayout(widget.layout);
      setConfig(widget.config);
    } else {
      setType('rss');
      setTitle('');
      setLayout(DEFAULT_LAYOUT);
      setConfig(defaultConfig('rss'));
    }
    setError('');
    setSaving(false);
  }, [open, widget]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError('');
    try {
      if (widget) {
        const patch: UpdateWidgetInput = { type, title, layout, config };
        await onUpdate(widget.id, patch);
      } else {
        const input: CreateWidgetInput = {
          type,
          title: title.trim() || TYPE_LABELS[type],
          layout,
          config,
        };
        await onCreate(input);
      }
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!widget || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(widget.id);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{widget ? '编辑组件' : '新增组件'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="类型"
            value={type}
            onChange={(e) => {
              const next = e.target.value as WidgetType;
              setType(next);
              setConfig(defaultConfig(next));
            }}
          >
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="标题"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <ConfigEditor type={type} config={config} onChange={setConfig} />
          <Divider />
          <Typography variant="caption" color="text.secondary">
            布局（x / y / 宽 w / 高 h，单位：网格）
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              label="x"
              type="number"
              value={layout.x}
              onChange={(e) => setLayout({ ...layout, x: Number(e.target.value) })}
            />
            <TextField
              label="y"
              type="number"
              value={layout.y}
              onChange={(e) => setLayout({ ...layout, y: Number(e.target.value) })}
            />
            <TextField
              label="w"
              type="number"
              value={layout.w}
              onChange={(e) => setLayout({ ...layout, w: Number(e.target.value) })}
            />
            <TextField
              label="h"
              type="number"
              value={layout.h}
              onChange={(e) => setLayout({ ...layout, h: Number(e.target.value) })}
            />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        {widget && onDelete && (
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => void handleDelete()}
            disabled={saving}
            sx={{ mr: 'auto' }}
          >
            删除
          </Button>
        )}
        <Button onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
