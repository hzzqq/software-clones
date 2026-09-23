import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { ApiError } from '../api/client';
import { gridApi } from '../api/gridbase';
import { FIELD_TYPES } from '../fieldTypes';
import type { FieldType, GridView } from '../types';

/**
 * 网格编辑页（/tables/:id）：加载网格视图，支持增删行 / 增删字段，
 * 单元格在失焦时保存（空串存为 null）。
 */
export default function TableDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const tableId = Number(params.id);

  const [grid, setGrid] = useState<GridView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [fieldDialogOpen, setFieldDialogOpen] = useState<boolean>(false);
  const [fieldName, setFieldName] = useState<string>('');
  const [fieldType, setFieldType] = useState<FieldType>('text');

  const load = useCallback(async (): Promise<void> => {
    if (!Number.isInteger(tableId) || tableId <= 0) {
      setError('无效的表 id');
      setLoading(false);
      return;
    }
    try {
      setGrid(await gridApi.getGrid(tableId));
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载网格失败');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddRow = async (): Promise<void> => {
    try {
      await gridApi.addRow(tableId);
      setNotice('已新增一行');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '新增行失败');
    }
  };

  const handleDeleteRow = async (rowId: number): Promise<void> => {
    try {
      await gridApi.deleteRow(rowId);
      setNotice('已删除该行');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除行失败');
    }
  };

  const handleAddField = async (): Promise<void> => {
    const name = fieldName.trim();
    if (!name) {
      return;
    }
    try {
      await gridApi.addField(tableId, { name, type: fieldType });
      setFieldDialogOpen(false);
      setFieldName('');
      setFieldType('text');
      setNotice(`已新增字段「${name}」`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '新增字段失败');
    }
  };

  const handleDeleteField = async (fieldId: number, name: string): Promise<void> => {
    if (!window.confirm(`删除字段「${name}」？该列的所有单元格数据将一并删除。`)) {
      return;
    }
    try {
      await gridApi.deleteField(fieldId);
      setNotice('已删除字段');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除字段失败');
    }
  };

  const handleCellSave = async (
    rowId: number,
    fieldId: number,
    original: string,
    next: string,
  ): Promise<void> => {
    if (next === original) {
      return;
    }
    try {
      await gridApi.setCell(rowId, fieldId, next.trim() === '' ? null : next);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败');
      await load();
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!grid) {
    return (
      <Box>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        ) : null}
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />}>
          返回表列表
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <IconButton component={RouterLink} to="/" aria-label="返回" size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>
          {grid.table.name}
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => void handleAddRow()}>
          新增行
        </Button>
        <Button
          variant="outlined"
          startIcon={<ViewColumnOutlinedIcon />}
          onClick={() => setFieldDialogOpen(true)}
        >
          新增字段
        </Button>
      </Stack>

      {grid.fields.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ViewColumnOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            还没有任何字段
          </Typography>
          <Typography variant="body2" color="text.secondary">
            点击「新增字段」建立第一列，然后再添加行。
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56 }}>#</TableCell>
                {grid.fields.map((field) => (
                  <TableCell key={field.id}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Box sx={{ fontWeight: 600 }}>{field.name}</Box>
                      <Typography variant="caption" color="text.secondary">
                        {FIELD_TYPES.find((t) => t.id === field.type)?.label ?? field.type}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={`删除字段 ${field.name}`}
                        onClick={() => void handleDeleteField(field.id, field.name)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {grid.rows.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {idx + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="删除行"
                        onClick={() => void handleDeleteRow(row.id)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  {grid.fields.map((field) => {
                    const original = row.cells[field.id] ?? '';
                    return (
                      <TableCell key={field.id} sx={{ minWidth: 140 }}>
                        <TextField
                          fullWidth
                          size="small"
                          variant="standard"
                          defaultValue={original}
                          onBlur={(e) =>
                            void handleCellSave(row.id, field.id, original, e.target.value)
                          }
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)}>
        <DialogTitle>新增字段</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 280 }}>
            <TextField
              label="字段名称"
              size="small"
              autoFocus
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
            />
            <TextField
              label="字段类型"
              size="small"
              select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
            >
              {FIELD_TYPES.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={() => void handleAddField()} disabled={!fieldName.trim()}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice.length > 0}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
