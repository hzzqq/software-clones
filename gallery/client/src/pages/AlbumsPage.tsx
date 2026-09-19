import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import { galleryApi, type Album, type Asset, assetFileUrl } from '../api/gallery';
import { ApiError } from '../api/client';
import AssetCard from '../components/AssetCard';
import Lightbox from '../components/Lightbox';

/** 相册集管理：列表 / 新建 / 重命名 / 删除 / 打开（增删图片）。 */
export default function AlbumsPage(): JSX.Element {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState<Album | null>(null);
  const [albumAssets, setAlbumAssets] = useState<Asset[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<number[]>([]);
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const [error, setError] = useState('');

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      setAlbums(await galleryApi.listAlbums());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const openAlbum = useCallback(async (album: Album): Promise<void> => {
    setSelected(album);
    setAlbumAssets(await galleryApi.albumAssets(album.id));
  }, []);

  const loadAllAssets = useCallback(async () => {
    setAllAssets(await galleryApi.listAssets());
  }, []);

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return;
    try {
      const a = await galleryApi.createAlbum(newName.trim());
      setCreateOpen(false);
      setNewName('');
      await loadAlbums();
      await openAlbum(a);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '创建失败');
    }
  };

  const handleRename = async (): Promise<void> => {
    if (!selected || !renameName.trim()) return;
    try {
      await galleryApi.renameAlbum(selected.id, renameName.trim());
      setRenameOpen(false);
      await loadAlbums();
      setSelected({ ...selected, name: renameName.trim() });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '重命名失败');
    }
  };

  const handleDelete = async (album: Album): Promise<void> => {
    try {
      await galleryApi.deleteAlbum(album.id);
      if (selected?.id === album.id) {
        setSelected(null);
        setAlbumAssets([]);
      }
      await loadAlbums();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const handleAdd = async (): Promise<void> => {
    if (!selected || selectedToAdd.length === 0) return;
    try {
      await galleryApi.addToAlbum(selected.id, selectedToAdd);
      setAddOpen(false);
      setSelectedToAdd([]);
      await openAlbum(selected);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '添加失败');
    }
  };

  const handleRemove = async (assetId: number): Promise<void> => {
    if (!selected) return;
    try {
      await galleryApi.removeFromAlbum(selected.id, assetId);
      setAlbumAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '移除失败');
    }
  };

  if (loading) return <CircularProgress />;

  if (!selected) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            相册集
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            新建相册
          </Button>
        </Stack>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <List>
          {albums.map((a) => (
            <ListItem
              key={a.id}
              divider
              secondaryAction={
                <Stack direction="row">
                  <IconButton onClick={() => {
                    setRenameName(a.name);
                    setRenameOpen(true);
                  }} aria-label="重命名">
                    <EditOutlinedIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(a)} aria-label="删除">
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemText primary={a.name} secondary={`${a.assetCount ?? 0} 张`} />
              <Button
                startIcon={<FolderOpenOutlinedIcon />}
                onClick={() => openAlbum(a)}
                sx={{ mr: 1 }}
              >
                打开
              </Button>
            </ListItem>
          ))}
          {albums.length === 0 && (
            <Typography color="text.secondary">还没有相册，点击「新建相册」。</Typography>
          )}
        </List>

        <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
          <DialogTitle>新建相册</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="相册名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleCreate}>
              创建
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={renameOpen} onClose={() => setRenameOpen(false)}>
          <DialogTitle>重命名相册</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="相册名称"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenameOpen(false)}>取消</Button>
            <Button variant="contained" onClick={handleRename}>
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <Button onClick={() => {
          setSelected(null);
          setAlbumAssets([]);
        }}>
          ← 返回
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ mx: 2 }}>
          {selected.name}
        </Typography>
        <Chip label={`${albumAssets.length} 张`} />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            loadAllAssets();
            setAddOpen(true);
          }}
        >
          添加图片
        </Button>
        <Button
          startIcon={<EditOutlinedIcon />}
          onClick={() => {
            setRenameName(selected.name);
            setRenameOpen(true);
          }}
        >
          重命名
        </Button>
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => handleDelete(selected)}>
          删除相册
        </Button>
      </Stack>
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {albumAssets.length === 0 ? (
        <Typography color="text.secondary">该相册暂无图片，点击「添加图片」。</Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 2,
          }}
        >
          {albumAssets.map((asset, i) => (
            <Box key={asset.id}>
              <AssetCard
                asset={asset}
                onOpen={() => setLightbox({ open: true, index: i })}
                onDelete={() => handleRemove(asset.id)}
              />
            </Box>
          ))}
        </Box>
      )}

      <Lightbox
        assets={albumAssets}
        index={lightbox.index}
        open={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        onIndexChange={(i) => setLightbox((s) => ({ ...s, index: i }))}
      />

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>添加图片到「{selected.name}」</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 1,
              maxHeight: 400,
              overflow: 'auto',
            }}
          >
            {allAssets.map((a) => (
              <Box
                key={a.id}
                onClick={() =>
                  setSelectedToAdd((prev) =>
                    prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                  )
                }
                sx={{
                  border: selectedToAdd.includes(a.id) ? '2px solid #3b82f6' : '2px solid transparent',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                <img
                  src={assetFileUrl(a.id)}
                  alt={a.originalName}
                  style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 8 }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={selectedToAdd.length === 0}
            onClick={handleAdd}
          >
            添加 ({selectedToAdd.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
