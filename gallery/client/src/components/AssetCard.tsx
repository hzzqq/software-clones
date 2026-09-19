import { Card, CardMedia, CardActionArea, IconButton, Box } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { type Asset, assetFileUrl } from '../api/gallery';

interface AssetCardProps {
  asset: Asset;
  onOpen: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

/** 单张图片卡片：缩略图 + 删除按钮。 */
export default function AssetCard({ asset, onOpen, onDelete }: AssetCardProps): JSX.Element {
  return (
    <Card sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
      <CardActionArea onClick={() => onOpen(asset)}>
        <CardMedia
          component="img"
          image={assetFileUrl(asset.id)}
          alt={asset.originalName}
          sx={{ height: 160, objectFit: 'cover' }}
        />
      </CardActionArea>
      <IconButton
        size="small"
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          bgcolor: 'rgba(0,0,0,0.5)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
        }}
        onClick={() => onDelete(asset)}
        aria-label="删除"
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
      <Box
        sx={{
          px: 1,
          py: 0.5,
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {asset.originalName}
      </Box>
    </Card>
  );
}
