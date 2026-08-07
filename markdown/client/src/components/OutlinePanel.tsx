import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { OutlineItem } from '../utils/markdown';

interface Props {
  items: OutlineItem[];
  /** 当前高亮的大纲序号（-1 表示无）。 */
  activeIndex: number;
  onJump: (item: OutlineItem) => void;
}

/**
 * 大纲（TOC）侧栏（cycle 263）。
 * 由 `extractOutline` 解析出的 H1–H6 生成，按层级缩进；点击可跳转到编辑区对应行
 * 并同步滚动预览区锚点。
 */
export default function OutlinePanel({ items, activeIndex, onJump }: Props): JSX.Element {
  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        overflowY: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="overline" sx={{ px: 1.5, pt: 1, display: 'block', color: 'text.secondary' }}>
        大纲（{items.length}）
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
          正文中还没有标题。用 # 开头即可创建标题。
        </Typography>
      ) : (
        <List dense disablePadding>
          {items.map((item) => (
            <ListItemButton
              key={`${item.id}-${item.index}`}
              selected={item.index === activeIndex}
              onClick={() => onJump(item)}
              sx={{ pl: 1 + (item.level - 1) * 1.2, pr: 1, py: 0.25 }}
            >
              <ListItemText
                primary={item.text || '（空标题）'}
                primaryTypographyProps={{
                  noWrap: true,
                  fontSize: item.level <= 2 ? 13 : 12,
                  fontWeight: item.level === 1 ? 700 : item.level === 2 ? 600 : 400,
                  color: item.level >= 4 ? 'text.secondary' : 'text.primary',
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
