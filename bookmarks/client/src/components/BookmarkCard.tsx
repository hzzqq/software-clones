import { Box, Card, CardActionArea, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Bookmark } from '../types';
import { extractDomain } from '../utils/url';
import Favicon from './Favicon';

interface BookmarkCardProps {
  bookmark: Bookmark;
  view: 'list' | 'grid';
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

/**
 * 书签卡片。列表 / 网格两种布局共用；
 * 点击标题或地址区域在新标签页打开原网页。
 */
export default function BookmarkCard({
  bookmark,
  view,
  onEdit,
  onDelete,
}: BookmarkCardProps): JSX.Element {
  const domain = extractDomain(bookmark.url);

  const openArea =
    view === 'list' ? (
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap>
          {bookmark.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>
          {bookmark.url}
        </Typography>
      </Box>
    ) : (
      <Box sx={{ minWidth: 0, mt: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} noWrap>
          {bookmark.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>
          {domain}
        </Typography>
      </Box>
    );

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: view === 'grid' ? 'column' : 'row',
        transition: 'box-shadow .15s ease',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardActionArea
        component="a"
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start' }}
      >
        <CardContent sx={{ display: 'flex', gap: 1.5, width: '100%', p: 2 }}>
          <Favicon url={bookmark.url} title={bookmark.title} size={view === 'grid' ? 40 : 32} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            {openArea}
            {bookmark.description ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: view === 'grid' ? 2 : 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {bookmark.description}
              </Typography>
            ) : null}
            {bookmark.categoryName ? (
              <Chip
                label={bookmark.categoryName}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ mt: 1 }}
              />
            ) : null}
          </Box>
          <OpenInNewIcon sx={{ fontSize: 18, color: 'text.disabled', mt: 0.5, flexShrink: 0 }} />
        </CardContent>
      </CardActionArea>
      <Stack
        direction={view === 'grid' ? 'row' : 'column'}
        sx={{
          alignItems: 'center',
          justifyContent: view === 'grid' ? 'flex-end' : 'center',
          p: view === 'grid' ? 1 : 0.5,
        }}
      >
        <IconButton size="small" aria-label="编辑书签" onClick={() => onEdit(bookmark)}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="删除书签" color="error" onClick={() => onDelete(bookmark)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Card>
  );
}
