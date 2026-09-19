import { useEffect } from 'react';
import { Dialog, DialogContent, IconButton, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { type Asset, assetFileUrl } from '../api/gallery';

interface LightboxProps {
  assets: Asset[];
  index: number;
  open: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

/** 灯箱预览：大图展示 + 上一张/下一张 + 键盘导航。 */
export default function Lightbox({
  assets,
  index,
  open,
  onClose,
  onIndexChange,
}: LightboxProps): JSX.Element {
  const asset = assets[index];
  const count = assets.length;

  const goPrev = (): void => {
    if (count > 0) onIndexChange((index - 1 + count) % count);
  };
  const goNext = (): void => {
    if (count > 0) onIndexChange((index + 1) % count);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!open) return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, count]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogContent sx={{ position: 'relative', bgcolor: '#000', p: 0 }}>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 1 }}
          aria-label="关闭"
        >
          <CloseIcon />
        </IconButton>
        {asset && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src={assetFileUrl(asset.id)}
              alt={asset.originalName}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
            <Typography sx={{ color: '#fff', p: 1 }}>{asset.originalName}</Typography>
          </Box>
        )}
        {count > 1 && (
          <>
            <IconButton
              onClick={goPrev}
              sx={{ position: 'absolute', left: 8, top: '50%', color: '#fff' }}
              aria-label="上一张"
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={goNext}
              sx={{ position: 'absolute', right: 8, top: '50%', color: '#fff' }}
              aria-label="下一张"
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
