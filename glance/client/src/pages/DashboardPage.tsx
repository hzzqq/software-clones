import { ChangeEvent, useCallback, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
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
import { Widget, WidgetLayout, WidgetType } from '../types';
import { filterWidgets, sortWidgets, countWidgetsByType, filterWidgetsByType, summarizeWidgets, groupWidgetsByType, widgetTypeLabel, type WidgetSort } from '../utils/filterWidgets';

interface WidgetHandlers {
  onConfigure: (widget: Widget) => void;
  onRemove: (widget: Widget) => void;
  onCommit: (widget: Widget, text: string) => void;
}

/** Dispatches a widget to the matching component based on its type. */
function renderWidget(widget: Widget, handlers: WidgetHandlers): JSX.Element {
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
      return <Box sx={{ p: 2, color: 'text.secondary' }}>未知组件类型：{widgetTypeLabel(widget.type)}</Box>;
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
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<WidgetSort>('title');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [groupByType, setGroupByType] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<Widget | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const scoped = filterWidgetsByType(widgets, typeFilter);
  const visibleWidgets = sortWidgets(filterWidgets(search, scoped), sortBy);
  const typeCounts = countWidgetsByType(widgets);
  const summary = summarizeWidgets(visibleWidgets);
  const groupedWidgets = groupWidgetsByType(visibleWidgets);

  /** 渲染单个组件（供平铺视图与分组视图复用）。 */
  const renderItem = (widget: Widget): JSX.Element =>
    renderWidget(widget, {
      onConfigure: openEdit,
      onRemove: (w) => setDeleteTarget(w),
      onCommit: handleCommit,
    });

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

  const handleClearAll = useCallback(async (): Promise<void> => {
    await Promise.all(widgets.map((w) => removeWidget(w.id)));
    setClearAllOpen(false);
  }, [widgets, removeWidget]);

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
        <TextField
          size="small"
          placeholder="搜索组件…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="widget-sort-label">排序</InputLabel>
          <Select
            labelId="widget-sort-label"
            label="排序"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as WidgetSort)}
          >
            <MenuItem value="title">按标题</MenuItem>
            <MenuItem value="type">按类型</MenuItem>
            <MenuItem value="updatedAt">按更新时间</MenuItem>
          </Select>
        </FormControl>
        {Object.keys(typeCounts).length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="widget-type-label">类型</InputLabel>
            <Select
              labelId="widget-type-label"
              label="类型"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as string)}
            >
              <MenuItem value="">全部</MenuItem>
              {Object.keys(typeCounts).map((t) => (
                <MenuItem key={t} value={t}>
                  {widgetTypeLabel(t as WidgetType)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button
          color={groupByType ? 'primary' : 'inherit'}
          variant={groupByType ? 'contained' : 'outlined'}
          onClick={() => setGroupByType((v) => !v)}
        >
          按类型分组：{groupByType ? '开' : '关'}
        </Button>
        <Button startIcon={<UploadIcon />} onClick={() => fileRef.current?.click()}>
          导入 YAML
        </Button>
        <Button startIcon={<DownloadIcon />} onClick={() => void handleExport()}>
          导出 YAML
        </Button>
        {widgets.length > 0 && (
          <Button color="warning" variant="outlined" onClick={() => setClearAllOpen(true)}>
            清空所有
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".yaml,.yml"
          hidden
          onChange={(e) => void handleImportFile(e)}
        />
      </Stack>

      {widgets.length > 0 && Object.keys(typeCounts).length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 0.5 }}>
          {Object.entries(typeCounts).map(([t, n]) => (
            <Chip key={t} size="small" variant="outlined" label={`${widgetTypeLabel(t as WidgetType)}: ${n}`} />
          ))}
          <Chip size="small" color="primary" variant="outlined" label={`共 ${summary.total} 个组件 · ${summary.typeCount} 类`} />
        </Stack>
      )}

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

      {!loading && widgets.length > 0 && visibleWidgets.length === 0 && (
        <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
          没有匹配「{search}」的组件。
        </Box>
      )}

      {!loading && visibleWidgets.length > 0 && !groupByType && (
        <WidgetGrid widgets={visibleWidgets} onLayoutChange={onLayoutChange} renderItem={renderItem} />
      )}

      {!loading && visibleWidgets.length > 0 && groupByType && (
        <Box>
          {Object.entries(groupedWidgets).map(([type, list]) => (
            <Box key={type} sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Chip size="small" color="primary" label={widgetTypeLabel(type as WidgetType)} />
                <Chip size="small" variant="outlined" label={`${list.length} 个`} />
              </Stack>
              <WidgetGrid widgets={list} onLayoutChange={onLayoutChange} renderItem={renderItem} />
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>删除组件？</DialogTitle>
        <DialogContent>将删除「{deleteTarget?.title}」，此操作不可撤销。</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleteTarget) void handleDelete(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={clearAllOpen} onClose={() => setClearAllOpen(false)}>
        <DialogTitle>清空所有组件？</DialogTitle>
        <DialogContent>将删除全部 {widgets.length} 个组件，此操作不可撤销。</DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllOpen(false)}>取消</Button>
          <Button color="error" onClick={() => void handleClearAll()}>
            清空
          </Button>
        </DialogActions>
      </Dialog>

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
