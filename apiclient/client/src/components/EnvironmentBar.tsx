import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Environment } from '../types';
import { parseVariablesText, variablesToText } from '../utils/template';

export interface EnvironmentBarProps {
  environments: Environment[];
  /** 当前请求草稿里引用了但环境变量表中缺失的变量名。 */
  missingVars: string[];
  onActivate: (id: number | null) => void | Promise<void>;
  onCreate: (name: string) => void | Promise<void>;
  onUpdate: (
    id: number,
    patch: { name?: string; variables?: Record<string, string> },
  ) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
}

/**
 * 环境选择条：顶部下拉切换激活环境，「管理」按钮打开环境编辑对话框。
 * 变量以 `key=value` 多行文本编辑（与集合的 Params/Headers 编辑习惯一致）。
 */
export default function EnvironmentBar({
  environments,
  missingVars,
  onActivate,
  onCreate,
  onUpdate,
  onDelete,
}: EnvironmentBarProps): JSX.Element {
  const active = useMemo(() => environments.find((e) => e.active) ?? null, [environments]);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [varsDraft, setVarsDraft] = useState('');
  const [newName, setNewName] = useState('');
  const [dirty, setDirty] = useState(false);

  const selected = useMemo(
    () => environments.find((e) => e.id === selectedId) ?? null,
    [environments, selectedId],
  );

  // 打开对话框时默认选中激活环境（没有则选第一个）。
  useEffect(() => {
    if (!open) return;
    if (selectedId !== null && environments.some((e) => e.id === selectedId)) return;
    const fallback = active ?? environments[0] ?? null;
    setSelectedId(fallback ? fallback.id : null);
  }, [open, environments, active, selectedId]);

  // 切换选中项时载入草稿（未保存的编辑会被覆盖，因此先提示）。
  useEffect(() => {
    if (!selected) {
      setNameDraft('');
      setVarsDraft('');
      setDirty(false);
      return;
    }
    setNameDraft(selected.name);
    setVarsDraft(variablesToText(selected.variables));
    setDirty(false);
  }, [selected]);

  const activeVarCount = active ? Object.keys(active.variables).length : 0;

  const handleSelectChange = (raw: string): void => {
    void onActivate(raw === '' ? null : Number(raw));
  };

  const handleSaveSelected = async (): Promise<void> => {
    if (!selected) return;
    await onUpdate(selected.id, {
      name: nameDraft.trim() || selected.name,
      variables: parseVariablesText(varsDraft),
    });
    setDirty(false);
  };

  const handleCreate = async (): Promise<void> => {
    const n = newName.trim();
    if (!n) return;
    await onCreate(n);
    setNewName('');
  };

  const handleDelete = async (id: number): Promise<void> => {
    await onDelete(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ px: 1.5, py: 1 }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="env-select-label">环境</InputLabel>
          <Select
            labelId="env-select-label"
            label="环境"
            value={active ? String(active.id) : ''}
            onChange={(e) => handleSelectChange(String(e.target.value))}
          >
            <MenuItem value="">
              <em>不使用环境</em>
            </MenuItem>
            {environments.map((env) => (
              <MenuItem key={env.id} value={String(env.id)}>
                {env.name}（{Object.keys(env.variables).length}）
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" variant="outlined" startIcon={<TuneIcon />} onClick={() => setOpen(true)}>
          管理环境
        </Button>
        {active && (
          <Chip size="small" color="success" variant="outlined" label={`已启用 ${activeVarCount} 个变量`} />
        )}
        {missingVars.length > 0 && (
          <Tooltip title="这些变量在当前环境中未定义，发送时将原样保留占位符">
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`未定义：${missingVars.slice(0, 4).join(', ')}${missingVars.length > 4 ? '…' : ''}`}
            />
          </Tooltip>
        )}
        <Typography variant="caption" color="text.secondary">
          在 URL / 参数 / 头 / 体中使用 {'{{变量名}}'} 引用
        </Typography>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>环境与变量</DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" spacing={2} sx={{ minHeight: 340 }}>
            <Box sx={{ width: 240, borderRight: '1px solid', borderColor: 'divider', pr: 1 }}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="新建环境名"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleCreate();
                    }
                  }}
                />
                <Tooltip title="新建环境">
                  <span>
                    <IconButton size="small" onClick={() => void handleCreate()} disabled={!newName.trim()}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              <Divider />
              <List dense sx={{ maxHeight: 280, overflowY: 'auto' }}>
                {environments.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                    暂无环境，先新建一个。
                  </Typography>
                )}
                {environments.map((env) => (
                  <ListItemButton
                    key={env.id}
                    selected={env.id === selectedId}
                    onClick={() => setSelectedId(env.id)}
                  >
                    <ListItemText
                      primary={env.name}
                      secondary={`${Object.keys(env.variables).length} 个变量${env.active ? ' · 已激活' : ''}`}
                    />
                    <Tooltip title="删除环境">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(env.id);
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                ))}
              </List>
            </Box>

            <Box sx={{ flexGrow: 1 }}>
              {!selected ? (
                <Typography variant="body2" color="text.secondary">
                  请选择左侧的一个环境进行编辑。
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    label="环境名称"
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value);
                      setDirty(true);
                    }}
                  />
                  <TextField
                    label="变量（每行一个 key=value）"
                    value={varsDraft}
                    onChange={(e) => {
                      setVarsDraft(e.target.value);
                      setDirty(true);
                    }}
                    multiline
                    minRows={10}
                    placeholder={'base_url=https://httpbin.org\ntoken=abc123'}
                    inputProps={{ style: { fontFamily: 'monospace', fontSize: 13 } }}
                  />
                  {dirty && <Alert severity="info">有未保存的修改，点击「保存变量」生效。</Alert>}
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={() => void handleSaveSelected()} disabled={!dirty}>
                      保存变量
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => void onActivate(selected.id)}
                      disabled={selected.active}
                    >
                      {selected.active ? '当前已激活' : '设为激活环境'}
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
