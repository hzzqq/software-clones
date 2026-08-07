import { useState } from 'react';
import { Avatar, Box } from '@mui/material';
import { faviconUrl } from '../utils/url';

interface FaviconProps {
  url: string;
  title: string;
  size?: number;
}

/**
 * 站点 favicon：优先加载 `https://<domain>/favicon.ico`，
 * 加载失败（跨域拦截 / 站点无图标）时回退为标题首字母图标。
 */
export default function Favicon({ url, title, size = 32 }: FaviconProps): JSX.Element {
  const [failed, setFailed] = useState<boolean>(false);
  const src = faviconUrl(url);
  const letter = (title.trim()[0] ?? '?').toUpperCase();

  if (!src || failed) {
    return (
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: 'primary.main',
          fontSize: size * 0.5,
          flexShrink: 0,
        }}
      >
        {letter}
      </Avatar>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        objectFit: 'contain',
        flexShrink: 0,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );
}
