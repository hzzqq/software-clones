import { Box } from '@mui/material';
import { type Asset } from '../api/gallery';
import AssetCard from './AssetCard';

interface AssetGridProps {
  assets: Asset[];
  onOpen: (index: number) => void;
  onDelete: (asset: Asset) => void;
}

/** 响应式图片网格；空态给出引导文案。 */
export default function AssetGrid({ assets, onOpen, onDelete }: AssetGridProps): JSX.Element {
  if (assets.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        暂无图片，点击右上角「上传」添加。
      </Box>
    );
  }
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 2,
      }}
    >
      {assets.map((asset, i) => (
        <AssetCard key={asset.id} asset={asset} onOpen={() => onOpen(i)} onDelete={onDelete} />
      ))}
    </Box>
  );
}
