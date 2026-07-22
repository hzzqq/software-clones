import { ChangeEvent, useCallback, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import WidgetGrid from '../components/WidgetGrid';
import WidgetConfigModal from '../components/WidgetConfigModal';
import RssWidget from '../components/widgets/RssWidget';
import WeatherWidget from '../components/widgets/WeatherWidget';
import BookmarksWidget from '../components/widgets/BookmarksWidget';
import StatusWidget from '../components/widgets/StatusWidget';
import ClockWidget from '../components/widgets/ClockWidget';
import NotesWidget from '../components/widgets/NotesWidget';
import { useWidgets } from '../hooks/useWidgets';
import { CreateWidgetInput, UpdateWidgetInput } from '../api/widgets';
import { configApi } from '../api/config';
import { Widget, WidgetLayout } from '../types';

interface WidgetHandlers {
  onConfigure: (widget: Widget) => void;
  onRemove: (widget: Widget) => void;
  onCommit: (widget: Widget, text: string) => void;
}

/** Dispatches a widget to the matching component based on its type. */
function renderWidget(
  widget: Widget,
  handlers: WidgetHandlers
): JSX.Element {
  const common = {
    widget,
    onConfigure: () => handlers.onConfigure(widget),
    onRemove: () => handlers.onRemove(widget),
  };
  switch (widget.type) {
    case 'rss':
      return <RssWidget {...common} />;
    case 'weather':
      return <WeatherWidget {...common} />;
    case 'bookmarks':
      return <BookmarksWidget {...common} />;
    case 'status':
      return <StatusWidget {...common} />;
    case 'clock':
      return <ClockWidget {...common} />;
    case 'notes':
      return <NotesWidget {...common} onCommit={(t) => handlers.onCommit(widget, t)} />;
    default:
      return (
        <Box sx={{ p: 2, color: 'text.secondary' }}>未知组件类型：{widget.type}</Box>
      );
  }
}

/** Main dashboard: grid of widgets + add/config/import/export controls. */
export default function DashboardPage(): JSX.Element {
  const {
    widgets,
    loading,
    error,
    reload,
    addWidget,
    updateWidget,
    removeWidget,
    updateLayout,
  } = useWidgets();

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Widget | null>(null);
  const [importError, setImportError] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const openCreate = useCallback((): void => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((widget: Widget): void => {
    setEditing(widget);
    setModalOpen(true);
  }, []);

  const handleCreate = useCallback(
    async (input: CreateWidgetInput): Promise<void> => {
      await addWidget(input);
    },
    [addWidget]
  );

  const handleUpdate = useCallback(
    async (id: number, patch: UpdateWidgetInput): Promise<void> => {
      await updateWidget(id, patch);
    },
    [updateWidget]
  );

  const handleDelete = useCallback(
    async (id: number): Promise<void> => {
      await removeWidget(id);
    },
    [removeWidget]
  );

  const handleCommit = useCallback(
    async (widget: Widget, text: string): Promise<void> => {
      await updateWidget(widget.id, { config: { ...widget.config, text } });
    },
    [updateWidget]
  );

  const onLayoutChange = useCallback(
    (id: number, layout: WidgetLayout): void => {
      void updateLayout(id, layout);
    },
    [updateLayout]
  );

  const handleExport = useCallback(async (): Promise<void> => {
    try {
      const yaml: string = await configApi.exportYaml();
      const blob = new Blob([yaml], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'glance-config.yaml';
      link.click();
      URL.revokeObjectURL(url);
      setImportError('');
    } catch (e) {
      setImportError((e as Error).message);
    }
  }, []);

  const handleImportFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await configApi.importYaml(text);
        await reload();
        setImportError('');
      } catch (err) {
        setImportError((err as Error).message);
      } finally {
        e.target.value = '';
      }
    },
    [reload]
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          新增组件
        </Button>
        <Button startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
          导入 YAML
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={() => void handleExport()}>
          导出 YAML
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".yaml,.yml"
          hidden
          onChange={(e) => void handleImportFile(e)}
        />
      </Stack>

      {importError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {importError}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && widgets.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            py: 6,
          }}
        >
          还没有组件，点击「新增组件」开始搭建你的仪表盘。
        </Box>
      )}

      {!loading && widgets.length > 0 && (
        <WidgetGrid
          widgets={widgets}
          onLayoutChange={onLayoutChange}
          renderItem={(widget) =>
            renderWidget(widget, {
              onConfigure: openEdit,
              onRemove: (w) => handleDelete(w.id),
              onCommit: handleCommit,
            })
          }
        />
      )}

      <WidgetConfigModal
        open={modalOpen}
        widget={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onClose={() => setModalOpen(false)}
      />
    </Box>
  );
}
