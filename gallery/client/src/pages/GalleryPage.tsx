import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  CircularProgress,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { galleryApi, type Asset, type Album, type Tag } from '../api/gallery';
import { ApiError } from '../api/client';
import AssetGrid from '../components/AssetGrid';
import Lightbox from '../components/Lightbox';
import UploadDialog from '../components/UploadDialog';

/** 相册首页：筛选（相册/标签）+ 网格 + 上传 + 灯箱。 */
export default function GalleryPage(): JSX.Element {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [albumFilter, setAlbumFilter] = useState<number | ''>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params =
        albumFilter !== ''
          ? { album: albumFilter }
          : tagFilter
            ? { tag: tagFilter }
            : undefined;
      const data = await galleryApi.listAssets(params);
      setAssets(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [albumFilter, tagFilter]);

  const loadMeta = useCallback(async () => {
    try {
      const [al, tg] = await Promise.all([galleryApi.listAlbums(), galleryApi.listTags()]);
      setAlbums(al);
      setTags(tg);
    } catch {
      /* 忽略：不影响主列表 */
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleDelete = async (asset: Asset): Promise<void> => {
    try {
      await galleryApi.deleteAsset(asset.id);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const handleUploaded = (uploaded: Asset[]): void => {
    setAssets((prev) => [...uploaded, ...prev]);
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>
          我的相册
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="album-filter">相册</InputLabel>
          <Select
            labelId="album-filter"
            label="相册"
            value={albumFilter}
            onChange={(e) => {
              setTagFilter('');
              setAlbumFilter(e.target.value as number | '');
            }}
          >
            <MenuItem value="">全部</MenuItem>
            {albums.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name} ({a.assetCount ?? 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="tag-filter">标签</InputLabel>
          <Select
            labelId="tag-filter"
            label="标签"
            value={tagFilter}
            onChange={(e) => {
              setAlbumFilter('');
              setTagFilter(e.target.value as string);
            }}
          >
            <MenuItem value="">全部</MenuItem>
            {tags.map((t) => (
              <MenuItem key={t.id} value={t.name}>
                {t.name} ({t.count ?? 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setUploadOpen(true)}>
          上传
        </Button>
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      {loading ? (
        <CircularProgress />
      ) : (
        <AssetGrid
          assets={assets}
          onOpen={(i) => setLightbox({ open: true, index: i })}
          onDelete={handleDelete}
        />
      )}

      <Lightbox
        assets={assets}
        index={lightbox.index}
        open={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
        onIndexChange={(i) => setLightbox((s) => ({ ...s, index: i }))}
      />
      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
    </Box>
  );
}
