import { useMemo } from 'react';
import { marked } from 'marked';
import { Box } from '@mui/material';

interface Props {
  content: string;
}

export default function MarkdownPreview({ content }: Props): JSX.Element {
  const html = useMemo(() => {
    marked.setOptions({ breaks: true, gfm: true });
    return marked.parse(content || '') as string;
  }, [content]);

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
