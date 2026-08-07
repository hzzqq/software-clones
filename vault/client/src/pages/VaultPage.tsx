import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { VaultEntry, VaultEntryInput, VaultFilter } from '../types';
import { CATEGORIES } from '../types';
import { entriesApi } from '../api/entries';
import EntryCard from '../components/EntryCard';
import EntryDialog from '../components/EntryDialog';
import PasswordGeneratorDialog from '../components/PasswordGeneratorDialog';

const FILTER_CATEGORIES: string[] = ['全部', ...CATEGORIES];

export default function VaultPage(): JSX.Element {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<VaultFilter>({ q: '', category: '全部' });

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await entriesApi.list(filter);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = entries.length;
    const withUrl = entries.filter((e) => e.url).length;
    const byCategory = new Map<string, number>();
    for (const e of entries) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
    return { total, withUrl, byCategory };
  }, [entries]);

  const handleSubmit = async (input: VaultEntryInput): Promise<void> => {
    if (editing) {
      await entriesApi.update(editing.id, input);
      setNotice('条目已更新');
    } else {
      await entriesApi.create(input);
      setNotice('条目已保存');
    }
    await load();
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    try {
      await entriesApi.remove(deleteTarget.id);
      setNotice('条目已删除');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            密码保险库
          </Typography>
          <Typography variant="body2" color="text.secondary">
            共 {stats.total} 条 · 含网址 {stats.withUrl} 条
            {stats.byCategory.size > 0 && (
              <span>
                {' '}
                ·{' '}
                {Array.from(stats.byCategory.entries())
                  .map(([c, n]) => `${c} ${n}`)
                  .join(' / ')}
              </span>
            )}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setGeneratorOpen(true)}>
          随机密码
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          新建条目
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="搜索标题 / 用户名 / 网址 / 备注…"
            value={filter.q}
            onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            sx={{ minWidth: 280, flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="分类"
            value={filter.category}
            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
            sx={{ minWidth: 140 }}
          >
            {FILTER_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          {(filter.q || filter.category !== '全部') && (
            <Button size="small" onClick={() => setFilter({ q: '', category: '全部' })}>
              清除筛选
            </Button>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : entries.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            {filter.q || filter.category !== '全部' ? '没有匹配的密码条目' : '还没有密码条目'}
          </Typography>
          {!filter.q && filter.category === '全部' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              创建第一条
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {entries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <EntryCard
                entry={entry}
                onEdit={(e) => {
                  setEditing(e);
                  setDialogOpen(true);
                }}
                onDelete={setDeleteTarget}
                onNotify={setNotice}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <EntryDialog
        open={dialogOpen}
        entry={editing}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <PasswordGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onUse={(pwd) => {
          setNotice('密码已生成，可粘贴到任意条目');
          setGeneratorOpen(false);
          void copyGeneratedToClipboard(pwd, setNotice);
        }}
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2500}
        onClose={() => setNotice('')}
        message={notice}
      />

      {/* 删除确认 */}
      <Snackbar
        open={Boolean(deleteTarget)}
        autoHideDuration={null}
        message={deleteTarget ? `确定删除「${deleteTarget.title}」？此操作不可撤销。` : ''}
        action={
          <Stack direction="row" spacing={1}>
            <Button color="inherit" size="small" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button color="error" size="small" onClick={() => void confirmDelete()}>
              删除
            </Button>
          </Stack>
        }
      />
    </Box>
  );
}

/** 把生成的密码复制到剪贴板并提示。 */
async function copyGeneratedToClipboard(pwd: string, notify: (m: string) => void): Promise<void> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(pwd);
      notify('密码已复制到剪贴板');
    }
  } catch {
    /* 无权限时仅提示已生成 */
  }
}
