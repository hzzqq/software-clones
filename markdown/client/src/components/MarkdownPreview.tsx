import { useMemo } from 'react';
import { marked } from 'marked';
import { Box } from '@mui/material';
import { extractOutline } from '../utils/markdown';
import { sanitizeHtml } from '../utils/sanitize';

interface Props {
  content: string;
}

/**
 * 把 markdown 渲染为带锚点 id 的安全 HTML。
 * 锚点序号与 `extractOutline` 完全对齐（H1–H6），大纲侧栏据此跳转。
 */
export function renderMarkdownHtml(content: string): string {
  marked.setOptions({ breaks: true, gfm: true });
  const outline = extractOutline(content);
  const raw = sanitizeHtml(marked.parse(content || '') as string);
  let i = 0;
  return raw.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_m, lvl, text) => {
    const id = outline[i]?.id ?? `h-${i}`;
    i += 1;
    return `<h${lvl} id="${id}">${text}</h${lvl}>`;
  });
}

export default function MarkdownPreview({ content }: Props): JSX.Element {
  const html = useMemo(() => renderMarkdownHtml(content), [content]);

  return (
    <Box
      className="markdown-body"
      sx={{
        '& h1': { fontSize: '1.6rem', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 },
        '& h2': { fontSize: '1.3rem' },
        '& h3': { fontSize: '1.1rem' },
        '& code': { bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5, fontFamily: 'monospace' },
        '& pre': { bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflowX: 'auto' },
        '& blockquote': { borderLeft: '3px solid', borderColor: 'divider', pl: 1.5, color: 'text.secondary' },
        '& a': { color: 'primary.main' },
        '& img': { maxWidth: '100%' },
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
