import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import type { Bookmark, Category, ViewMode } from '../types';
import { ApiError } from '../api/client';
import { bookmarksApi } from '../api/bookmarks';
import { categoriesApi } from '../api/categories';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocalStorage } from '../hooks/useLocalStorage';
import BookmarkCard from '../components/BookmarkCard';
import BookmarkFormDialog from '../components/BookmarkFormDialog';
import CategoryManagerDialog from '../components/CategoryManagerDialog';

/** 分类筛选取值：'all' 全部 / 'none' 未分类 / 数字 = 具体分类。 */
type CategoryFilter = 'all' | 'none' | number;

/**
 * 书签收藏主页面：搜索、分类筛选、列表/网格切换、增删改查闭环。
 */
export default function BookmarksPage(): JSX.Element {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [view, setView] = useLocalStorage<ViewMode>('bookmarks:view', 'grid');

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const loadBookmarks = useCallback(async (): Promise<void> => {
    try {
      const data = await bookmarksApi.list({
        categoryId: categoryFilter === 'all' || categoryFilter === 'none' ? undefined : categoryFilter,
        uncategorized: categoryFilter === 'none',
        q: debouncedSearch || undefined,
      });
      setBookmarks(data);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载书签失败');
    }
  }, [categoryFilter, debouncedSearch]);

  const loadCategories = useCallback(async (): Promise<void> => {
    try {
      setCategories(await categoriesApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '加载分类失败');
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const handleSaved = (_saved: Bookmark): void => {
    setNotice(editing ? '书签已更新' : '书签已添加');
    setEditing(null);
    void loadBookmarks();
    void loadCategories();
  };

  const handleDelete = async (bookmark: Bookmark): Promise<void> => {
    const confirmed = window.confirm(`删除书签「${bookmark.title}」？`);
    if (!confirmed) {
      return;
    }
    try {
      await bookmarksApi.remove(bookmark.id);
      setNotice('书签已删除');
      void loadBookmarks();
      void loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除失败');
    }
  };

  const categoryName = useMemo(() => {
    const map = new Map<number, string>(categories.map((c) => [c.id, c.name]));
    if (categoryFilter === 'all') return '全部书签';
    if (categoryFilter === 'none') return '未分类';
    return map.get(categoryFilter) ?? '书签';
  }, [categories, categoryFilter]);

  return (
    <Box>
      {/* 工具栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标题 / 网址 / 描述…"
              size="small"
              fullWidth
              sx={{ maxWidth: 420 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="category-filter-label">分类</InputLabel>
              <Select
                labelId="category-filter-label"
                label="分类"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="none">未分类</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_e, next: ViewMode | null) => {
                if (next) setView(next);
              }}
              aria-label="视图切换"
            >
              <ToggleButton value="list" aria-label="列表视图">
                <Tooltip title="列表视图">
                  <ViewListIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid" aria-label="网格视图">
                <Tooltip title="网格视图">
                  <GridViewIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={<FolderOpenIcon />}
              onClick={() => setCategoryManagerOpen(true)}
            >
              分类管理
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              添加书签
            </Button>
          </Stack>
          {/* 分类快捷筛选 chips */}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label="全部"
              size="small"
              color={categoryFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setCategoryFilter('all')}
            />
            <Chip
              label="未分类"
              size="small"
              color={categoryFilter === 'none' ? 'primary' : 'default'}
              onClick={() => setCategoryFilter('none')}
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={`${category.name} (${category.bookmarkCount})`}
                size="small"
                color={categoryFilter === category.id ? 'primary' : 'default'}
                onClick={() => setCategoryFilter(category.id)}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {/* 列表 / 网格 */}
      {bookmarks.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <BookmarkBorderIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            {categoryName}里还没有书签
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            点击右上角「添加书签」收藏第一个链接，或用左侧搜索框找找看。
          </Typography>
        </Paper>
      ) : view === 'list' ? (
        <Stack spacing={1.5}>
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              view="list"
              onEdit={(b) => {
                setEditing(b);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {bookmarks.map((bookmark) => (
            <Grid item xs={12} sm={6} md={4} key={bookmark.id}>
              <BookmarkCard
                bookmark={bookmark}
                view="grid"
                onEdit={(b) => {
                  setEditing(b);
                  setFormOpen(true);
                }}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <BookmarkFormDialog
        open={formOpen}
        bookmark={editing}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />

      <CategoryManagerDialog
        open={categoryManagerOpen}
        categories={categories}
        onClose={() => setCategoryManagerOpen(false)}
        onChanged={setCategories}
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
