import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import BrushIcon from '@mui/icons-material/Brush';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import TitleIcon from '@mui/icons-material/Title';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import FilterIcon from '@mui/icons-material/Filter';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CallMergeIcon from '@mui/icons-material/CallMerge';
import { uid, applyFilter, getFilterLabel, formatPercent, clampOpacity, clampNumber, formatBytes, blendOver } from '../utils/image';
import { formatRelativeTime } from '../utils/time';
import { duplicateLayerName } from '../utils/layers';
import { designApi } from '../api/designs';
import type { Layer, Tool, FilterKind, Design } from '../types';

const WIDTH = 900;
const HEIGHT = 600;
const COLORS = ['#1e1e1e', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5'];

interface Draft {
  kind: 'rect' | 'ellipse' | 'line';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stroke: string;
  strokeWidth: number;
}
type Drawing = Draft | { kind: 'pen' } | null;

function ctxOf(layer: Layer): CanvasRenderingContext2D {
  const ctx = layer.canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取图层上下文');
  return ctx;
}

function makeLayer(index: number): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  return {
    id: uid(),
    name: `图层 ${index}`,
    visible: true,
    opacity: 1,
    canvas,
  };
}

function loadDataUrl(canvas: HTMLCanvasElement, url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(img, 0, 0);
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Photopea 克隆 —— 核心画布编辑器。
 * 维护多层离屏 canvas，合成到主画布；支持画笔/形状/文字/橡皮、图层管理、
 * 灰度/反色/亮度滤镜、撤销重做、导出 PNG 与保存设计到后端。
 */
export default function CanvasEditor(): JSX.Element {
  const mainRef = useRef<HTMLCanvasElement | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const selectedIdRef = useRef<string>('');
  const drawingRef = useRef<Drawing>(null);
  const penRef = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<{ count: number; data: string[] }[]>([]);
  const redoStack = useRef<{ count: number; data: string[] }[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [stroke, setStroke] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selectedId, setSelectedIdState] = useState('');
  const [name, setName] = useState('未命名设计');
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const designIdRef = useRef<number | null>(null);
  const saveTimer = useRef<number>(0);
  const [saveStatus, setSaveStatus] = useState<'' | 'saved' | 'updated' | 'error'>('');
  const [loadOpen, setLoadOpen] = useState(false);
  const [designList, setDesignList] = useState<Design[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [exportScale, setExportScale] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [estSize, setEstSize] = useState(0);
  const [brightnessVal, setBrightnessVal] = useState(1.2);
  const [contrastVal, setContrastVal] = useState(1.2);
  const [saturationVal, setSaturationVal] = useState(1);

  const selectLayer = useCallback((id: string): void => {
    selectedIdRef.current = id;
    setSelectedIdState(id);
  }, []);

  const composite = useCallback((): void => {
    const main = mainRef.current;
    if (!main) return;
    const mctx = main.getContext('2d');
    if (!mctx) return;
    mctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      mctx.globalAlpha = layer.opacity;
      mctx.drawImage(layer.canvas, 0, 0);
    }
    mctx.globalAlpha = 1;
  }, []);

  const getSelected = useCallback((): Layer | undefined => {
    const id = selectedIdRef.current;
    const direct = layersRef.current.find((l) => l.id === id);
    if (direct) return direct;
    return layersRef.current[layersRef.current.length - 1];
  }, []);

  const pushUndo = useCallback((): void => {
    const snapshot = {
      count: layersRef.current.length,
      data: layersRef.current.map((l) => l.canvas.toDataURL()),
    };
    undoStack.current.push(snapshot);
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const restore = useCallback(
    (snap: { count: number; data: string[] }): void => {
      const layers = layersRef.current;
      while (layers.length < snap.count) layers.push(makeLayer(layers.length + 1));
      while (layers.length > snap.count) layers.pop();
      Promise.all(layers.map((l, i) => loadDataUrl(l.canvas, snap.data[i]))).then(() => {
        if (!layers.find((l) => l.id === selectedIdRef.current) && layers.length) {
          selectLayer(layers[layers.length - 1].id);
        }
        composite();
        setVersion((v) => v + 1);
      });
    },
    [composite, selectLayer]
  );

  const undo = useCallback((): void => {
    if (undoStack.current.length < 2) return;
    const cur = undoStack.current.pop()!;
    redoStack.current.push(cur);
    const prev = undoStack.current[undoStack.current.length - 1];
    restore(prev);
  }, [restore]);

  const redo = useCallback((): void => {
    if (!redoStack.current.length) return;
    const snap = redoStack.current.pop()!;
    undoStack.current.push(snap);
    restore(snap);
  }, [restore]);

  const addLayer = useCallback((): void => {
    pushUndo();
    const layer = makeLayer(layersRef.current.length + 1);
    layersRef.current.push(layer);
    selectLayer(layer.id);
    composite();
    setVersion((v) => v + 1);
  }, [pushUndo, selectLayer, composite]);

  const removeLayer = useCallback(
    (id: string): void => {
      if (layersRef.current.length <= 1) return;
      pushUndo();
      layersRef.current = layersRef.current.filter((l) => l.id !== id);
      if (!layersRef.current.find((l) => l.id === selectedIdRef.current)) {
        selectLayer(layersRef.current[layersRef.current.length - 1].id);
      }
      composite();
      setVersion((v) => v + 1);
    },
    [pushUndo, selectLayer, composite]
  );

  const moveLayer = useCallback(
    (id: string, dir: -1 | 1): void => {
      const layers = layersRef.current;
      const i = layers.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= layers.length) return;
      pushUndo();
      [layers[i], layers[j]] = [layers[j], layers[i]];
      composite();
      setVersion((v) => v + 1);
    },
    [pushUndo, composite]
  );

  const duplicateLayer = useCallback(
    (targetId?: string): void => {
      const id = targetId ?? selectedIdRef.current;
      const sel = layersRef.current.find((l) => l.id === id);
      if (!sel) return;
      pushUndo();
      const canvas = document.createElement('canvas');
      canvas.width = sel.canvas.width;
      canvas.height = sel.canvas.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(sel.canvas, 0, 0);
      const name = duplicateLayerName(
        sel.name,
        layersRef.current.map((l) => l.name)
      );
      const layer: Layer = {
        id: uid(),
        name,
        visible: sel.visible,
        opacity: sel.opacity,
        canvas,
      };
      const i = layersRef.current.findIndex((l) => l.id === sel.id);
      layersRef.current.splice(i + 1, 0, layer);
      selectLayer(layer.id);
      composite();
      setVersion((v) => v + 1);
    },
    [pushUndo, selectLayer, composite]
  );

  const mergeDown = useCallback(
    (targetId?: string): void => {
      const id = targetId ?? selectedIdRef.current;
      const layers = layersRef.current;
      const i = layers.findIndex((l) => l.id === id);
      if (i <= 0) return; // 没有下方的图层，无法合并
      const top = layers[i];
      const bottom = layers[i - 1];
      pushUndo();
      const tImg = ctxOf(top).getImageData(0, 0, WIDTH, HEIGHT);
      const bImg = ctxOf(bottom).getImageData(0, 0, WIDTH, HEIGHT);
      const td = tImg.data;
      const bd = bImg.data;
      for (let p = 0; p < bd.length; p += 4) {
        // 用标准 source-over 合成，把两层（含各自不透明度）烘焙到下层像素
        const res = blendOver(
          { r: td[p], g: td[p + 1], b: td[p + 2], a: td[p + 3] },
          top.opacity,
          { r: bd[p], g: bd[p + 1], b: bd[p + 2], a: bd[p + 3] },
          bottom.opacity
        );
        bd[p] = res.r;
        bd[p + 1] = res.g;
        bd[p + 2] = res.b;
        bd[p + 3] = res.a;
      }
      ctxOf(bottom).putImageData(bImg, 0, 0);
      // 不透明度已烘焙进像素，避免后续合成时重复计算
      bottom.opacity = 1;
      layers.splice(i, 1);
      selectLayer(bottom.id);
      composite();
      setVersion((v) => v + 1);
    },
    [pushUndo, selectLayer, composite]
  );

  const toggleVisible = useCallback(
    (id: string): void => {
      const layer = layersRef.current.find((l) => l.id === id);
      if (!layer) return;
      layer.visible = !layer.visible;
      composite();
      setVersion((v) => v + 1);
    },
    [composite]
  );

  const setOpacity = useCallback(
    (id: string, val: number): void => {
      const layer = layersRef.current.find((l) => l.id === id);
      if (!layer) return;
      layer.opacity = val;
      composite();
      setVersion((v) => v + 1);
    },
    [composite]
  );

  const renameLayer = useCallback((id: string, value: string): void => {
    const layer = layersRef.current.find((l) => l.id === id);
    if (!layer) return;
    layer.name = value;
    setVersion((v) => v + 1);
  }, []);

  const drawDraft = useCallback((ctx: CanvasRenderingContext2D, d: Draft): void => {
    ctx.strokeStyle = d.stroke;
    ctx.lineWidth = d.strokeWidth;
    ctx.beginPath();
    if (d.kind === 'rect') {
      const x = Math.min(d.x0, d.x1);
      const y = Math.min(d.y0, d.y1);
      ctx.strokeRect(x, y, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
    } else if (d.kind === 'ellipse') {
      const cx = (d.x0 + d.x1) / 2;
      const cy = (d.y0 + d.y1) / 2;
      ctx.ellipse(cx, cy, Math.abs(d.x1 - d.x0) / 2, Math.abs(d.y1 - d.y0) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(d.x0, d.y0);
      ctx.lineTo(d.x1, d.y1);
      ctx.stroke();
    }
  }, []);

  const getPos = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = mainRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const onMouseDown = (e: React.MouseEvent): void => {
    const sel = getSelected();
    if (!sel) return;
    const pos = getPos(e);
    if (tool === 'select') return;
    if (tool === 'text') {
      const text = window.prompt('输入文字：');
      if (text) {
        pushUndo();
        const ctx = ctxOf(sel);
        ctx.fillStyle = stroke;
        ctx.font = `${Math.max(16, strokeWidth * 8)}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(text, pos.x, pos.y);
        composite();
      }
      return;
    }
    pushUndo();
    if (tool === 'brush' || tool === 'eraser') {
      const ctx = ctxOf(sel);
      ctx.save();
      if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      composite();
      penRef.current = pos;
      drawingRef.current = { kind: 'pen' };
    } else {
      drawingRef.current = {
        kind: tool,
        x0: pos.x,
        y0: pos.y,
        x1: pos.x,
        y1: pos.y,
        stroke,
        strokeWidth,
      };
    }
  };

  const onMouseMove = (e: React.MouseEvent): void => {
    const sel = getSelected();
    if (!sel) return;
    const pos = getPos(e);
    const d = drawingRef.current;
    if (!d) return;
    if (d.kind === 'pen') {
      const ctx = ctxOf(sel);
      ctx.save();
      if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(penRef.current!.x, penRef.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      penRef.current = pos;
      composite();
    } else {
      d.x1 = pos.x;
      d.y1 = pos.y;
      composite();
      const mctx = mainRef.current?.getContext('2d');
      if (mctx) drawDraft(mctx, d);
    }
  };

  const onMouseUp = (): void => {
    const d = drawingRef.current;
    if (!d) return;
    if (d.kind !== 'pen') {
      const sel = getSelected();
      if (sel) {
        const ctx = ctxOf(sel);
        ctx.strokeStyle = d.stroke;
        ctx.lineWidth = d.strokeWidth;
        ctx.beginPath();
        if (d.kind === 'rect') {
          const x = Math.min(d.x0, d.x1);
          const y = Math.min(d.y0, d.y1);
          ctx.strokeRect(x, y, Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0));
        } else if (d.kind === 'ellipse') {
          const cx = (d.x0 + d.x1) / 2;
          const cy = (d.y0 + d.y1) / 2;
          ctx.ellipse(cx, cy, Math.abs(d.x1 - d.x0) / 2, Math.abs(d.y1 - d.y0) / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.moveTo(d.x0, d.y0);
          ctx.lineTo(d.x1, d.y1);
          ctx.stroke();
        }
        composite();
      }
    }
    drawingRef.current = null;
    penRef.current = null;
  };

  const loadImage = useCallback(
    (file: File): void => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          pushUndo();
          const layer = makeLayer(layersRef.current.length + 1);
          const ctx = ctxOf(layer);
          const scale = Math.min(WIDTH / img.width, HEIGHT / img.height, 1);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
          layersRef.current.push(layer);
          selectLayer(layer.id);
          composite();
          setVersion((v) => v + 1);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [pushUndo, selectLayer, composite]
  );

  const applyImageFilter = useCallback(
    (kind: FilterKind, factor = 1): void => {
      const sel = getSelected();
      if (!sel) return;
      pushUndo();
      const ctx = ctxOf(sel);
      const img = ctx.getImageData(0, 0, WIDTH, HEIGHT);
      applyFilter(img.data, kind, factor);
      ctx.putImageData(img, 0, 0);
      composite();
    },
    [pushUndo, getSelected, composite]
  );

  const clearLayer = useCallback((): void => {
    const sel = getSelected();
    if (!sel) return;
    pushUndo();
    ctxOf(sel).clearRect(0, 0, WIDTH, HEIGHT);
    composite();
    setVersion((v) => v + 1);
  }, [pushUndo, getSelected, composite]);

  const exportPng = useCallback((scale = 1): void => {
    const main = mainRef.current;
    if (!main) return;
    const off = document.createElement('canvas');
    off.width = WIDTH * scale;
    off.height = HEIGHT * scale;
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.drawImage(main, 0, 0, off.width, off.height);
    const url = off.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `photopea${scale > 1 ? '@' + scale + 'x' : ''}.png`;
    a.href = url;
    a.click();
  }, []);

  /** 估算按某倍率导出 PNG 的字节大小（基于实际编码后的 dataURL 长度）。 */
  const estimatePngBytes = useCallback((scale: number): number => {
    const main = mainRef.current;
    if (!main) return 0;
    const off = document.createElement('canvas');
    off.width = WIDTH * scale;
    off.height = HEIGHT * scale;
    const octx = off.getContext('2d');
    if (!octx) return 0;
    octx.drawImage(main, 0, 0, off.width, off.height);
    const url = off.toDataURL('image/png');
    const comma = url.indexOf(',');
    const b64 = comma >= 0 ? url.slice(comma + 1) : '';
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
  }, []);

  useEffect(() => {
    if (exportOpen) setEstSize(estimatePngBytes(exportScale));
  }, [exportOpen, exportScale, estimatePngBytes]);

  const saveDesign = useCallback((): void => {
    const url = mainRef.current?.toDataURL('image/png');
    if (!url) return;
    setBusy(true);
    const payload = { name: name || '未命名设计', thumbnail: url, data: url };
    const isUpdate = designIdRef.current != null;
    const op = isUpdate
      ? designApi.update(designIdRef.current as number, payload)
      : designApi.create(payload);
    op
      .then((d) => {
        designIdRef.current = d.id;
        setBusy(false);
        setSaveStatus(isUpdate ? 'updated' : 'saved');
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => setSaveStatus(''), 2000);
      })
      .catch(() => {
        setBusy(false);
        setSaveStatus('error');
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => setSaveStatus(''), 3000);
      });
  }, [name]);

  const openLoad = useCallback((): void => {
    setLoadBusy(true);
    designApi
      .list()
      .then((list) => {
        setDesignList(list);
        setLoadBusy(false);
        setLoadOpen(true);
      })
      .catch(() => setLoadBusy(false));
  }, []);

  const loadDesign = useCallback(
    (d: Design): void => {
      const url = d.data;
      pushUndo();
      layersRef.current = [];
      const layer = makeLayer(1);
      layersRef.current.push(layer);
      selectLayer(layer.id);
      designIdRef.current = d.id;
      setName(d.name);
      loadDataUrl(layer.canvas, url).then(() => {
        composite();
        setVersion((v) => v + 1);
        setLoadOpen(false);
      });
    },
    [pushUndo, selectLayer, composite]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (k === 'y') {
          e.preventDefault();
          redo();
        } else if (k === 's') {
          e.preventDefault();
          saveDesign();
        }
        return;
      }
      if (typing) return;
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedIdRef.current) removeLayer(selectedIdRef.current);
          break;
        case 'Escape':
          setTool('select');
          break;
        case 'v':
        case 'V':
          setTool('select');
          break;
        case 'b':
        case 'B':
          setTool('brush');
          break;
        case 'e':
        case 'E':
          setTool('eraser');
          break;
        case 'r':
        case 'R':
          setTool('rect');
          break;
        case 'o':
        case 'O':
          setTool('ellipse');
          break;
        case 'l':
        case 'L':
          setTool('line');
          break;
        case 't':
        case 'T':
          setTool('text');
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveDesign, removeLayer, setTool]);

  useEffect(() => {
    if (layersRef.current.length === 0) {
      const layer = makeLayer(1);
      layersRef.current.push(layer);
      selectLayer(layer.id);
    }
    pushUndo();
    composite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layers = [...layersRef.current].reverse();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ p: 1, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <ToggleButtonGroup value={tool} exclusive onChange={(_e, v) => v && setTool(v)} size="small">
          <ToggleButton value="select" aria-label="选择">
            <OpenWithIcon />
          </ToggleButton>
          <ToggleButton value="brush" aria-label="画笔">
            <BrushIcon />
          </ToggleButton>
          <ToggleButton value="eraser" aria-label="橡皮">
            <AutoFixHighIcon />
          </ToggleButton>
          <ToggleButton value="rect" aria-label="矩形">
            <CropSquareIcon />
          </ToggleButton>
          <ToggleButton value="ellipse" aria-label="椭圆">
            <RadioButtonUncheckedIcon />
          </ToggleButton>
          <ToggleButton value="line" aria-label="直线">
            <NorthEastIcon />
          </ToggleButton>
          <ToggleButton value="text" aria-label="文字">
            <TitleIcon />
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={0.5}>
          {COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => setStroke(c)}
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                bgcolor: c,
                cursor: 'pointer',
                border: stroke === c ? '2px solid' : '1px solid',
                borderColor: stroke === c ? 'primary.main' : 'divider',
              }}
            />
          ))}
        </Stack>

        <TextField
          select
          size="small"
          label="线宽"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(clampNumber(Number(e.target.value), 1, 200, 4))}
          sx={{ width: 90 }}
        >
          {[1, 2, 4, 8, 16].map((w) => (
            <MenuItem key={w} value={w}>
              {w}
            </MenuItem>
          ))}
        </TextField>

        <IconButton onClick={undo} aria-label="撤销">
          <UndoIcon />
        </IconButton>
        <IconButton onClick={redo} aria-label="重做">
          <RedoIcon />
        </IconButton>

        <Divider orientation="vertical" flexItem />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadImage(f);
            e.target.value = '';
          }}
        />
        <IconButton onClick={() => fileRef.current?.click()} aria-label="打开图片">
          <FileOpenIcon />
        </IconButton>
        <IconButton onClick={openLoad} aria-label="打开设计" disabled={loadBusy}>
          <FolderOpenIcon />
        </IconButton>
        <IconButton onClick={(e) => setFilterAnchor(e.currentTarget)} aria-label="滤镜">
          <FilterIcon />
        </IconButton>
        <TextField
          select
          size="small"
          label="导出"
          value={exportScale}
          onChange={(e) => setExportScale(clampNumber(Number(e.target.value), 0.1, 8, 1))}
          sx={{ width: 80 }}
        >
          {[1, 2, 3].map((s) => (
            <MenuItem key={s} value={s}>
              {s}x
            </MenuItem>
          ))}
        </TextField>
        <IconButton onClick={() => setExportOpen(true)} aria-label="导出 PNG">
          <DownloadIcon />
        </IconButton>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={saveDesign} disabled={busy}>
          {busy ? '保存中…' : '保存'}
        </Button>
        {saveStatus === 'saved' && (
          <Typography variant="caption" color="success.main">已保存</Typography>
        )}
        {saveStatus === 'updated' && (
          <Typography variant="caption" color="success.main">已更新</Typography>
        )}
        {saveStatus === 'error' && (
          <Typography variant="caption" color="error.main">保存失败</Typography>
        )}

        <Menu
          anchorEl={filterAnchor}
          open={Boolean(filterAnchor)}
          onClose={() => setFilterAnchor(null)}
        >
          <MenuItem onClick={() => { applyImageFilter('grayscale'); setFilterAnchor(null); }}>{getFilterLabel('grayscale')}</MenuItem>
          <MenuItem onClick={() => { applyImageFilter('invert'); setFilterAnchor(null); }}>{getFilterLabel('invert')}</MenuItem>
          <MenuItem onClick={() => { applyImageFilter('sepia'); setFilterAnchor(null); }}>{getFilterLabel('sepia')}</MenuItem>
          <Box sx={{ px: 2, py: 1, minWidth: 200 }} onClick={(e) => e.stopPropagation()}>
            <Typography variant="caption">亮度（{brightnessVal.toFixed(1)}×）</Typography>
            <Slider
              min={0.3}
              max={2}
              step={0.1}
              value={brightnessVal}
              onChange={(_e, v) => setBrightnessVal(v as number)}
            />
            <Button
              size="small"
              fullWidth
              variant="outlined"
              onClick={() => {
                applyImageFilter('brightness', brightnessVal);
                setFilterAnchor(null);
              }}
            >
              应用亮度
            </Button>
          </Box>
          <Box sx={{ px: 2, py: 1, minWidth: 200 }} onClick={(e) => e.stopPropagation()}>
            <Typography variant="caption">对比度（{contrastVal.toFixed(1)}×）</Typography>
            <Slider
              min={0.3}
              max={2}
              step={0.1}
              value={contrastVal}
              onChange={(_e, v) => setContrastVal(v as number)}
            />
            <Button
              size="small"
              fullWidth
              variant="outlined"
              onClick={() => {
                applyImageFilter('contrast', contrastVal);
                setFilterAnchor(null);
              }}
            >
              应用对比度
            </Button>
          </Box>
          <Box sx={{ px: 2, py: 1, minWidth: 200 }} onClick={(e) => e.stopPropagation()}>
            <Typography variant="caption">饱和度（{saturationVal.toFixed(1)}×）</Typography>
            <Slider
              min={0}
              max={2}
              step={0.1}
              value={saturationVal}
              onChange={(_e, v) => setSaturationVal(v as number)}
            />
            <Button
              size="small"
              fullWidth
              variant="outlined"
              onClick={() => {
                applyImageFilter('saturate', saturationVal);
                setFilterAnchor(null);
              }}
            >
              应用饱和度
            </Button>
          </Box>
          <Divider />
          <MenuItem onClick={() => { clearLayer(); setFilterAnchor(null); }}>清空当前图层</MenuItem>
        </Menu>
      </Stack>

      <Box sx={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f1f3f5',
            p: 2,
            overflow: 'auto',
          }}
        >
          <canvas
            ref={mainRef}
            width={WIDTH}
            height={HEIGHT}
            style={{
              width: '100%',
              maxWidth: WIDTH,
              height: 'auto',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              cursor: tool === 'select' ? 'default' : 'crosshair',
              touchAction: 'none',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </Box>

        <Box
          key={version}
          sx={{
            width: 260,
            borderLeft: '1px solid',
            borderColor: 'divider',
            p: 1,
            overflowY: 'auto',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <strong>图层</strong>
            <Button size="small" startIcon={<CropSquareIcon />} onClick={addLayer}>
              新建
            </Button>
          </Stack>
          {layers.map((layer) => (
            <Box
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              sx={{
                p: 1,
                mb: 1,
                borderRadius: 2,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: layer.id === selectedId ? 'primary.main' : 'divider',
                bgcolor: layer.id === selectedId ? 'action.selected' : 'background.paper',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }}>
                  {layer.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
                <TextField
                  size="small"
                  value={layer.name}
                  onChange={(e) => renameLayer(layer.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  sx={{ flexGrow: 1 }}
                />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 1); }}>
                  <ArrowUpwardIcon />
                </IconButton>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, -1); }}>
                  <ArrowDownwardIcon />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={layersRef.current.findIndex((l) => l.id === layer.id) <= 0}
                  onClick={(e) => { e.stopPropagation(); mergeDown(layer.id); }}
                  aria-label="向下合并"
                >
                  <CallMergeIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                >
                  <ContentCopyIcon />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={layersRef.current.length <= 1}
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                >
                  <DeleteSweepIcon />
                </IconButton>
              </Stack>
              <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">不透明度</Typography>
                  <Typography variant="caption" color="text.secondary">{formatPercent(layer.opacity)}</Typography>
                </Stack>
                <Slider
                  size="small"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layer.opacity}
                  onChange={(_e, v) => setOpacity(layer.id, clampOpacity(v as number))}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <TextField
          size="small"
          label="设计名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ width: 240 }}
        />
      </Box>

      <Dialog open={loadOpen} onClose={() => setLoadOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>打开设计</DialogTitle>
        <DialogContent>
          {loadBusy ? (
            <Typography variant="body2">加载中…</Typography>
          ) : designList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              暂无可加载的设计，请先保存。
            </Typography>
          ) : (
            <List dense>
              {designList.map((d) => (
                <ListItemButton key={d.id} onClick={() => loadDesign(d)}>
                  <Avatar variant="rounded" src={d.thumbnail} sx={{ mr: 1, width: 40, height: 28 }} />
                  <ListItemText
                    primary={d.name}
                    secondary={`#${d.id} · 更新于 ${formatRelativeTime(d.updated_at) || '时间未知'}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>导出 PNG</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                导出倍率
              </Typography>
              <ToggleButtonGroup
                value={exportScale}
                exclusive
                onChange={(_e: React.MouseEvent<HTMLElement>, v: number | null) => {
                  if (v != null) setExportScale(v);
                }}
                size="small"
              >
                {[1, 2, 3].map((s) => (
                  <ToggleButton key={s} value={s}>
                    {s}x
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <Typography variant="body2">
              预估大小：<strong>{formatBytes(estSize)}</strong>
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>取消</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {
              exportPng(exportScale);
              setExportOpen(false);
            }}
          >
            下载
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
