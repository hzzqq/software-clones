import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TableChartIcon from '@mui/icons-material/TableChart';
import { ApiError } from '../api/client';
import { gridApi } from '../api/gridbase';
// MUI 的 <Table> 组件与领域类型 Table 同名，类型侧别名为 GridTable 避免重复声明
import type { Table as GridTable } from '../types';

/**
 * 表列表主页：新建 / 重命名 / 删除表，并进入网格视图。
 */
export default function TablesPage(): JSX.Element {
  const [tables, setTables] = useState<GridTable[]>([]);
  const [newName, setNewName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const load = useCallback(async (): Promise<void> => {
    try {
      setTables(await gridApi.listTables());
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (): Promise<void> => {
    const name = newName.trim();
    if (!name) {
      return;
    }
    try {
      await gridApi.createTable(name);
      setNewName('');
      setNotice(`已创建表「${name}」`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建失败');
    }
  };

  const handleRename = async (table: GridTable): Promise<void> => {
    const next = window.prompt('重命名表', table.name);
    if (next === null) {
      return;
    }
    const trimmed = next.trim();
    if (!trimmed || trimmed === table.name) {
      return;
    }
    try {
      await gridApi.renameTable(table.id, trimmed);
      setNotice('已重命名');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重命名失败');
    }
  };

  const handleDelete = async (table: GridTable): Promise<void> => {
    if (!window.confirm(`删除表「${table.name}」？该表所有字段与数据将一并删除。`)) {
      return;
    }
    try {
      await gridApi.deleteTable(table.id);
      setNotice('已删除');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        我的表
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <TextField
            label="新表名称"
            size="small"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
            }}
            placeholder="例如：客户名单"
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={!newName.trim()}>
            新建表
          </Button>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : tables.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <TableChartIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            还没有任何表
          </Typography>
          <Typography variant="body2" color="text.secondary">
            在上方输入名称并点击「新建表」开始。
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>更新时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id} hover>
                  <TableCell>
                    <RouterLink
                      to={`/tables/${table.id}`}
                      style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {table.name}
                    </RouterLink>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {new Date(table.updatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => void handleRename(table)} aria-label="重命名">
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => void handleDelete(table)}
                      aria-label="删除"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
