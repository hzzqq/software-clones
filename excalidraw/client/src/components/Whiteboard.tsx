import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, IconButton, TextField, MenuItem, Divider, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItemButton, ListItemText, Typography, Button, Chip } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import GridOnIcon from '@mui/icons-material/GridOn';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GestureIcon from '@mui/icons-material/Gesture';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import TitleIcon from '@mui/icons-material/Title';
import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { CanvasElement, Point, Scene, Tool } from '../types';
import { normalizeRect, hitTest, uid, serializeScene, snapPoint, boundingBox, getCenter } from '../utils/geometry';
import { sceneApi } from '../api/scenes';

interface Props {
  elements: CanvasElement[];
  setElements: (els: CanvasElement[] | ((prev: CanvasElement[]) => CanvasElement[])) => void;
}

const COLORS = ['#1e1e1e', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5'];

export default function Whiteboard({ elements, setElements }: Props): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rcRef = useRef<RoughCanvas | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [stroke, setStroke] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [loadOpen, setLoadOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [snap, setSnap] = useState(false);
  const GRID = 20;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const sceneIdRef = useRef<number | null>(null);

  const drawing = useRef<CanvasElement | null>(null);
  const dragInfo = useRef<{ id: string; offset: Point } | null>(null);
  const undoStack = useRef<CanvasElement[][]>([]);
  const redoStack = useRef<CanvasElement[][]>([]);

  const getPos = (e: React.MouseEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return snap ? snapPoint(p, GRID) : p;
  };

  const pushUndo = useCallback(() => {
    undoStack.current.push(elements);
    redoStack.current = [];
  }, [elements]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!rcRef.current) rcRef.current = rough.canvas(canvas);
    const rc = rcRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const all = drawing.current ? [...elements, drawing.current] : elements;
    for (const el of all) {
      const isSel = el.id === selectedId;
      const opts = { stroke: el.stroke, strokeWidth: el.strokeWidth, roughness: 1.4, seed: 1 };
      if (el.type === 'pen' && el.points) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        el.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
      } else if (el.type === 'rect') {
        const n = normalizeRect(el.x, el.y, el.w, el.h);
        rc.rectangle(n.x, n.y, n.w, n.h, opts);
      } else if (el.type === 'ellipse') {
        const n = normalizeRect(el.x, el.y, el.w, el.h);
        rc.ellipse(n.x + n.w / 2, n.y + n.h / 2, n.w, n.h, opts);
      } else if (el.type === 'arrow') {
        rc.line(el.x, el.y, el.x + el.w, el.y + el.h, opts);
      } else if (el.type === 'text' && el.text) {
        ctx.fillStyle = el.stroke;
        ctx.font = `${Math.max(14, el.strokeWidth * 8)}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(el.text, el.x, el.y);
      }
      if (isSel) {
        const b = normalizeRect(el.x, el.y, el.w, el.h);
        ctx.save();
        ctx.strokeStyle = '#4263eb';
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
        ctx.restore();
      }
    }
  }, [elements, selectedId]);

  // 画布尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    rcRef.current = rough.canvas(canvas);
    redraw();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    if (tool === 'select') {
      const hit = [...elements].reverse().find((el) => hitTest(el, pos));
      setSelectedId(hit ? hit.id : null);
      if (hit) dragInfo.current = { id: hit.id, offset: { x: pos.x - hit.x, y: pos.y - hit.y } };
      return;
    }
    if (tool === 'text') {
      const text = window.prompt('输入文字：');
      if (text) {
        pushUndo();
        setElements((prev) => [...prev, { id: uid(), type: 'text', stroke, strokeWidth, x: pos.x, y: pos.y, w: 0, h: 0, text }]);
      }
      return;
    }
    // 开始绘制
    pushUndo();
    const base = { id: uid(), stroke, strokeWidth, x: pos.x, y: pos.y, w: 0, h: 0 };
    if (tool === 'pen') {
      drawing.current = { ...base, type: 'pen', points: [pos] };
    } else {
      drawing.current = { ...base, type: tool as 'rect' | 'ellipse' | 'arrow' };
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const pos = getPos(e);
    if (dragInfo.current) {
      const { id, offset } = dragInfo.current;
      setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x: pos.x - offset.x, y: pos.y - offset.y } : el)));
      return;
    }
    if (!drawing.current) return;
    if (drawing.current.type === 'pen') {
      drawing.current = { ...drawing.current, points: [...(drawing.current.points ?? []), pos] };
    } else {
      drawing.current = { ...drawing.current, w: pos.x - drawing.current.x, h: pos.y - drawing.current.y };
    }
    redraw();
  };

  const onMouseUp = () => {
    if (dragInfo.current) {
      dragInfo.current = null;
      return;
    }
    if (drawing.current) {
      const el = drawing.current;
      const valid = el.type === 'pen' ? (el.points?.length ?? 0) > 1 : Math.abs(el.w) > 3 || Math.abs(el.h) > 3;
      if (valid) setElements((prev) => [...prev, el]);
      drawing.current = null;
      redraw();
    }
  };

  const undo = () => {
    if (!undoStack.current.length) return;
    redoStack.current.push(elements);
    setElements(undoStack.current.pop() ?? []);
  };
  const redo = () => {
    if (!redoStack.current.length) return;
    undoStack.current.push(elements);
    setElements(redoStack.current.pop() ?? []);
  };
  const clearAll = () => {
    setClearOpen(true);
  };
  const confirmClear = () => {
    setClearOpen(false);
    pushUndo();
    setElements([]);
    setSelectedId(null);
  };
  const deleteSelected = () => {
    if (!selectedId) return;
    pushUndo();
    setElements((prev) => prev.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const saveScene = async () => {
    try {
      const payload = JSON.stringify(elements);
      if (sceneIdRef.current != null) {
        await sceneApi.update(sceneIdRef.current, { data: payload });
      } else {
        const created = await sceneApi.create({ name: `白板 ${new Date().toLocaleString()}`, data: payload });
        sceneIdRef.current = created.id;
      }
      setSaveStatus('已保存');
    } catch {
      setSaveStatus('保存失败');
    }
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const openLoad = async () => {
    try {
      setScenes(await sceneApi.list());
      setLoadOpen(true);
    } catch {
      setSaveStatus('加载列表失败');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };
  const loadScene = (s: Scene) => {
    try {
      const els = JSON.parse(s.data) as CanvasElement[];
      setElements(els);
      sceneIdRef.current = s.id;
      setSelectedId(null);
      undoStack.current = [];
      redoStack.current = [];
      setLoadOpen(false);
      setSaveStatus(`已载入「${s.name}」`);
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus('解析场景失败');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'excalidraw.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportJson = () => {
    const blob = new Blob([serializeScene(elements)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'excalidraw.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 键盘快捷键：撤销/重做/删除选中/取消选择
  const shortcutRef = useRef({ undo, redo, deleteSelected, selectedId });
  shortcutRef.current = { undo, redo, deleteSelected, selectedId };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        shortcutRef.current.undo();
      } else if (mod && (key === 'y' || (e.shiftKey && key === 'z'))) {
        e.preventDefault();
        shortcutRef.current.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (shortcutRef.current.selectedId) {
          e.preventDefault();
          shortcutRef.current.deleteSelected();
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
        <ToggleButtonGroup value={tool} exclusive onChange={(_e, v) => v && setTool(v)} size="small">
          <ToggleButton value="select" aria-label="选择"><TitleIcon /></ToggleButton>
          <ToggleButton value="pen" aria-label="钢笔"><GestureIcon /></ToggleButton>
          <ToggleButton value="rect" aria-label="矩形"><CropSquareIcon /></ToggleButton>
          <ToggleButton value="ellipse" aria-label="椭圆"><RadioButtonUncheckedIcon /></ToggleButton>
          <ToggleButton value="arrow" aria-label="箭头"><NorthEastIcon /></ToggleButton>
          <ToggleButton value="text" aria-label="文字"><TitleIcon /></ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" spacing={0.5}>
          {COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => setStroke(c)}
              sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: stroke === c ? '2px solid' : '1px solid', borderColor: stroke === c ? 'primary.main' : 'divider' }}
            />
          ))}
        </Stack>
        <TextField select size="small" label="线宽" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} sx={{ width: 90 }}>
          {[1, 2, 4, 8].map((w) => (
            <MenuItem key={w} value={w}>{w}</MenuItem>
          ))}
        </TextField>
        <IconButton onClick={undo} aria-label="撤销"><UndoIcon /></IconButton>
        <IconButton onClick={redo} aria-label="重做"><RedoIcon /></IconButton>
        <IconButton onClick={deleteSelected} aria-label="删除选中" disabled={!selectedId}><DeleteSweepIcon /></IconButton>
        <IconButton onClick={clearAll} aria-label="清空" color="error"><DeleteSweepIcon /></IconButton>
        <Divider orientation="vertical" flexItem />
        <IconButton onClick={() => setSnap((v) => !v)} aria-label="网格吸附" color={snap ? 'primary' : 'default'} title="网格吸附">
          <GridOnIcon />
        </IconButton>
        <Divider orientation="vertical" flexItem />
        <IconButton onClick={openLoad} aria-label="打开已存白板"><FolderOpenIcon /></IconButton>
        <IconButton onClick={saveScene} aria-label="保存"><SaveIcon /></IconButton>
        <IconButton onClick={exportPng} aria-label="导出 PNG"><DownloadIcon /></IconButton>
        <IconButton onClick={exportJson} aria-label="导出 JSON"><DescriptionIcon /></IconButton>
        {saveStatus && (
          <Typography variant="caption" color={saveStatus.includes('失败') ? 'error' : 'success.main'} sx={{ ml: 1 }}>
            {saveStatus}
          </Typography>
        )}
        {(() => {
          const bb = boundingBox(elements);
          return bb ? (
            <Chip size="small" variant="outlined" sx={{ ml: 1 }} title="内容边界尺寸" label={`内容 ${Math.round(bb.width)}×${Math.round(bb.height)}`} />
          ) : null;
        })()}
        {selectedId && (() => {
          const sel = elements.find((e) => e.id === selectedId);
          if (!sel) return null;
          const c = getCenter(sel);
          return (
            <Chip size="small" variant="outlined" sx={{ ml: 1 }} title="选中元素中心坐标" label={`中心 ${Math.round(c.x)}, ${Math.round(c.y)}`} />
          );
        })()}
      </Stack>
      <Dialog open={loadOpen} onClose={() => setLoadOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>打开已存白板</DialogTitle>
        <DialogContent>
          {scenes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">暂无保存的白板。</Typography>
          ) : (
            <List dense>
              {scenes.map((s) => (
                <ListItemButton key={s.id} onClick={() => loadScene(s)}>
                  <ListItemText primary={s.name} secondary={new Date(s.updatedAt).toLocaleString()} />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>清空画布</DialogTitle>
        <DialogContent>
          <Typography variant="body2">此操作会移除当前所有图形，且可通过撤销恢复。确定继续吗？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearOpen(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={confirmClear}>清空</Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden', bgcolor: '#fafafa' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </Box>
    </Box>
  );
}
