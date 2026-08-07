import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CodeIcon from '@mui/icons-material/Code';
import type { LanguageOption, Snippet, Tag } from '../types';
import { ApiError } from '../api/client';
import { snippetsApi } from '../api/snippets';
import { LANGUAGES } from '../utils/highlight';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import SnippetCard from '../components/SnippetCard';
import SnippetEditorDialog from '../components/SnippetEditorDialog';

/**
 * 代码片段主页面：搜索、语言筛选、标签筛选、增删改查与复制闭环。
 */
export default function SnippetsPage(): JSX.Element {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const loadSnippets = useCallback(async (): Promise<void> => {
    try {
      const data = await snippetsApi.list({
        language: languageFilter || undefined,
        tag: tagFilter || undefined,
        q: debouncedSearch || undefined,
      });
      setSnippets(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载片段失败');
    }
  }, [languageFilter, tagFilter, debouncedSearch]);

  const loadTags = useCallback(async (): Promise<void> => {
    try {
      setTags(await snippetsApi.tags());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载标签失败');
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    void loadSnippets();
  }, [loadSnippets]);

  const handleSaved = (): void => {
    setNotice(editing ? '片段已更新' : '片段已保存');
    setEditing(null);
    void loadSnippets();
    void loadTags();
  };

  const handleDelete = async (snippet: Snippet): Promise<void> => {
    const confirmed = window.confirm(`删除片段「${snippet.title}」？`);
    if (!confirmed) {
      return;
    }
    try {
      await snippetsApi.remove(snippet.id);
      setNotice('片段已删除');
      void loadSnippets();
      void loadTags();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  return (
    <Box>
      {/* 工具栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题 / 代码内容…"
              size="small"
              fullWidth
              sx={{ maxWidth: 380 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="language-filter-label">语言</InputLabel>
              <Select
                labelId="language-filter-label"
                label="语言"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value as string)}
              >
                <MenuItem value="">全部语言</MenuItem>
                {LANGUAGES.map((lang: LanguageOption) => (
                  <MenuItem key={lang.id} value={lang.id}>
                    {lang.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="tag-filter-label">标签</InputLabel>
              <Select
                labelId="tag-filter-label"
                label="标签"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value as string)}
              >
                <MenuItem value="">全部标签</MenuItem>
                {tags.map((tag) => (
                  <MenuItem key={tag.id} value={tag.name}>
                    {tag.name} ({tag.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              新建片段
            </Button>
          </Stack>
          {tags.length > 0 ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={`${tag.name} (${tag.count})`}
                  size="small"
                  color={tagFilter === tag.name ? 'primary' : 'default'}
                  onClick={() => setTagFilter((prev) => (prev === tag.name ? '' : tag.name))}
                />
              ))}
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {snippets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CodeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            还没有匹配的代码片段
          </Typography>
          <Typography variant="body2" color="text.secondary">
            点击右上角「新建片段」保存第一段代码，或调整搜索 / 筛选条件。
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {snippets.map((snippet) => (
            <Grid item xs={12} md={6} key={snippet.id}>
              <SnippetCard
                snippet={snippet}
                onEdit={(s) => {
                  setEditing(s);
                  setEditorOpen(true);
                }}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <SnippetEditorDialog
        open={editorOpen}
        snippet={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

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
