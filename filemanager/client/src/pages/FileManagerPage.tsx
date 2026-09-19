import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Stack,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  fmApi,
  type FsEntry,
  type BrowseResult,
  type Bookmark,
  type Share,
  shareDownloadUrl,
} from '../api/filemanager';
import { ApiError } from '../api/client';
import FilePreview from '../components/FilePreview';

/** 简单的字节数可读化。 */
function formatSize(size: number | null): string {
  if (size == null) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/** 文件管理器主页：目录树浏览 + 预览 + 分享 + 书签。 */
export default function FileManagerPage(): JSX.Element {
  const [browse, setBrowse] = useState<BrowseResult | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewEntry, setPreviewEntry] = useState<FsEntry | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState('');
  const [shareResult, setShareResult] = useState<Share | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fmApi.browse(p);
      setBrowse(data);
      setCurrentPath(data.path);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      setBookmarks(await fmApi.listBookmarks());
    } catch {
      /* 忽略 */
    }
  }, []);

  useEffect(() => {
    load('/');
    loadBookmarks();
  }, [load, loadBookmarks]);

  const openEntry = (entry: FsEntry): void => {
    if (entry.isDir) {
      load(entry.path);
    } else {
      setPreviewEntry(entry);
    }
  };

  const openShare = (target: string): void => {
    setShareTarget(target);
    setShareResult(null);
    setCopied(false);
    setShareOpen(true);
  };

  const handleCreateShare = async (): Promise<void> => {
    try {
      const share = await fmApi.createShare(shareTarget);
      setShareResult(share);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '创建分享失败');
    }
  };

  const handleAddBookmark = async (): Promise<void> => {
    const name = bookmarkName.trim() || (currentPath === '/' ? '根目录' : currentPath.split('/').filter(Boolean).pop());
    try {
      await fmApi.createBookmark(currentPath, name);
      setBookmarkOpen(false);
      setBookmarkName('');
      await loadBookmarks();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '添加书签失败');
    }
  };

  const handleDeleteBookmark = async (id: number): Promise<void> => {
    try {
      await fmApi.deleteBookmark(id);
      await loadBookmarks();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '删除书签失败');
    }
  };

  const copyShare = async (): Promise<void> => {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareDownloadUrl(shareResult.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略：剪贴板不可用时用户可手动复制 */
    }
  };

  return (
    <Box>
      {/* 路径栏 + 操作 */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <IconButton disabled={!browse || browse.path === '/'} onClick={() => browse && load(browse.parent)} aria-label="上一级">
          <ArrowUpwardIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700} sx={{ mr: 1 }}>
          {browse?.path === '/' ? '根目录' : browse?.path}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<BookmarkBorderIcon />} onClick={() => { setBookmarkName(''); setBookmarkOpen(true); }}>
          收藏此目录
        </Button>
        <Button onClick={() => load(currentPath)}>刷新</Button>
      </Stack>

      {/* 书签 */}
      {bookmarks.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {bookmarks.map((b) => (
            <Chip
              key={b.id}
              label={b.name}
              onClick={() => load(b.path)}
              onDelete={() => handleDeleteBookmark(b.id)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <CircularProgress />
      ) : browse ? (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {browse.entries.length === 0 && (
            <ListItem>
              <ListItemText primary="空目录" secondary="把文件放进服务端的 data/fm-root/ 后刷新即可看到" />
            </ListItem>
          )}
          {browse.entries.map((entry) => (
            <ListItem
              key={entry.path}
              button
              onClick={() => openEntry(entry)}
              divider
              secondaryAction={
                !entry.isDir ? (
                  <Tooltip title="分享短链">
                    <IconButton edge="end" onClick={(e) => { e.stopPropagation(); openShare(entry.path); }} aria-label="分享">
                      <InsertDriveFileOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                ) : undefined
              }
            >
              <ListItemIcon>
                {entry.isDir ? <FolderIcon color="primary" /> : <InsertDriveFileOutlinedIcon />}
              </ListItemIcon>
              <ListItemText
                primary={entry.name}
                secondary={`${entry.isDir ? '目录' : formatSize(entry.size)} · ${new Date(entry.modified).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      ) : null}

      <FilePreview entry={previewEntry} onClose={() => setPreviewEntry(null)} onShare={openShare} />

      {/* 添加书签对话框 */}
      <Dialog open={bookmarkOpen} onClose={() => setBookmarkOpen(false)}>
        <DialogTitle>收藏目录</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary">
            目录：{currentPath}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="书签名称"
            value={bookmarkName}
            onChange={(e) => setBookmarkName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookmarkOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddBookmark}>
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分享短链对话框 */}
      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>分享短链</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary">
            文件：{shareTarget}
          </Typography>
          {!shareResult ? (
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleCreateShare}>
                生成短链
              </Button>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                value={shareDownloadUrl(shareResult.code)}
                InputProps={{ readOnly: true }}
                label="分享链接"
              />
              <Button startIcon={<ContentCopyIcon />} sx={{ mt: 1 }} onClick={copyShare}>
                {copied ? '已复制' : '复制链接'}
              </Button>
              {shareResult.expiry && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  有效期至：{shareResult.expiry}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
