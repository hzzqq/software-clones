import { Box, Divider, Link, Typography } from '@mui/material';
import { parseMarkdown, type InlineToken, type MarkdownBlock } from '../utils/markdown';

interface MarkdownProps {
  /** Markdown 源文本。 */
  source: string;
  /** 源文本为空时展示的占位内容；缺省不渲染任何东西。 */
  empty?: string;
  /** 紧凑模式：更小的字号与间距，用于卡片内嵌预览。 */
  dense?: boolean;
}

/** 行内 token → React 节点。全部走文本节点，不使用 dangerouslySetInnerHTML。 */
function renderInline(tokens: InlineToken[], keyPrefix: string): JSX.Element[] {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (t.type) {
      case 'bold':
        return (
          <Box key={key} component="strong" sx={{ fontWeight: 700 }}>
            {t.value}
          </Box>
        );
      case 'italic':
        return (
          <Box key={key} component="em" sx={{ fontStyle: 'italic' }}>
            {t.value}
          </Box>
        );
      case 'strike':
        return (
          <Box key={key} component="s" sx={{ textDecoration: 'line-through', opacity: 0.7 }}>
            {t.value}
          </Box>
        );
      case 'code':
        return (
          <Box
            key={key}
            component="code"
            sx={{
              px: 0.5,
              borderRadius: 0.5,
              bgcolor: 'action.hover',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.875em',
            }}
          >
            {t.value}
          </Box>
        );
      case 'link':
        // href 已在解析阶段通过 safeHref 白名单校验。
        return (
          <Link
            key={key}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            underline="hover"
            onClick={(e) => e.stopPropagation()}
          >
            {t.value}
          </Link>
        );
      case 'text':
      default:
        return <Box key={key} component="span">{t.value}</Box>;
    }
  });
}

const HEADING_SIZE: Record<number, string> = {
  1: '1.4rem',
  2: '1.25rem',
  3: '1.1rem',
  4: '1rem',
  5: '0.95rem',
  6: '0.9rem',
};

function renderBlock(block: MarkdownBlock, index: number, dense: boolean): JSX.Element {
  const key = `b-${index}`;
  const gap = dense ? 0.5 : 1;
  switch (block.type) {
    case 'heading':
      return (
        <Typography
          key={key}
          component="div"
          sx={{ fontWeight: 700, fontSize: HEADING_SIZE[block.level] ?? '1rem', mt: gap, mb: 0.5 }}
        >
          {renderInline(block.inline, key)}
        </Typography>
      );
    case 'paragraph':
      return (
        <Typography key={key} component="div" variant={dense ? 'body2' : 'body1'} sx={{ mb: gap }}>
          {renderInline(block.inline, key)}
        </Typography>
      );
    case 'quote':
      return (
        <Box
          key={key}
          sx={{
            borderLeft: 3,
            borderColor: 'divider',
            pl: 1.5,
            py: 0.25,
            mb: gap,
            color: 'text.secondary',
          }}
        >
          <Typography component="div" variant={dense ? 'body2' : 'body1'}>
            {renderInline(block.inline, key)}
          </Typography>
        </Box>
      );
    case 'list':
      return (
        <Box
          key={key}
          component={block.ordered ? 'ol' : 'ul'}
          sx={{ pl: 3, mb: gap, mt: 0, '& li': { mb: 0.25 } }}
        >
          {block.items.map((item, i) => (
            <Box key={`${key}-i-${i}`} component="li">
              <Typography component="span" variant={dense ? 'body2' : 'body1'}>
                {renderInline(item, `${key}-i-${i}`)}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    case 'code':
      return (
        <Box
          key={key}
          component="pre"
          sx={{
            m: 0,
            mb: gap,
            p: 1.25,
            borderRadius: 1,
            bgcolor: 'action.hover',
            overflowX: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.8125rem',
            whiteSpace: 'pre',
          }}
        >
          {block.value}
        </Box>
      );
    case 'hr':
    default:
      return <Divider key={key} sx={{ my: gap }} />;
  }
}

/**
 * 安全的 Markdown 渲染组件。
 * 解析出的 token 全部以 React 元素/文本节点输出，任何 HTML 标签都会被当作
 * 普通字符显示，因此无需 sanitize 依赖即可杜绝 XSS。
 */
export default function Markdown({ source, empty = '', dense = false }: MarkdownProps): JSX.Element {
  const blocks: MarkdownBlock[] = parseMarkdown(source);
  if (blocks.length === 0) {
    if (!empty) return <></>;
    return (
      <Typography variant="body2" color="text.secondary">
        {empty}
      </Typography>
    );
  }
  return (
    <Box sx={{ wordBreak: 'break-word', '& > :last-child': { mb: 0 } }}>
      {blocks.map((b, i) => renderBlock(b, i, dense))}
    </Box>
  );
}
