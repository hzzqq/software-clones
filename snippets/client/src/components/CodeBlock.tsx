import { Box, Paper } from '@mui/material';
import { highlightCode } from '../utils/highlight';
import CopyButton from './CopyButton';

interface CodeBlockProps {
  code: string;
  language: string;
  maxHeight?: number;
}

/**
 * 高亮代码块。安全性：`highlightCode` 内部对每个 token / 普通文本都先转义再拼 HTML，
 * 因此这里的 `dangerouslySetInnerHTML` 是安全的（内容不可能包含未转义的标签）。
 */
export default function CodeBlock({ code, language, maxHeight = 420 }: CodeBlockProps): JSX.Element {
  const html = highlightCode(code, language);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
        <CopyButton text={code} />
      </Box>
      <Paper
        variant="outlined"
        sx={{
          bgcolor: 'grey.50',
          borderColor: 'divider',
          overflow: 'auto',
          maxHeight,
        }}
      >
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre',
            '& .tok-comment': { color: 'text.disabled' },
          }}
        >
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </Box>
      </Paper>
    </Box>
  );
}
