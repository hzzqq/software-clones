import { Box, Card, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Snippet } from '../types';
import { languageLabel } from '../utils/highlight';
import CodeBlock from './CodeBlock';

interface SnippetCardProps {
  snippet: Snippet;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

/**
 * 代码片段卡片：标题 + 语言 + 标签 + 高亮代码块 + 复制 / 编辑 / 删除。
 */
export default function SnippetCard({ snippet, onEdit, onDelete }: SnippetCardProps): JSX.Element {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2, pb: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1, minWidth: 120 }}>
            {snippet.title}
          </Typography>
          <Chip label={languageLabel(snippet.language)} size="small" color="primary" variant="outlined" />
          <IconButton size="small" aria-label="编辑片段" onClick={() => onEdit(snippet)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="删除片段" color="error" onClick={() => onDelete(snippet)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
        {snippet.tags.length > 0 ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {snippet.tags.map((tag) => (
              <Chip key={tag} label={`# ${tag}`} size="small" variant="outlined" />
            ))}
          </Stack>
        ) : null}
      </CardContent>
      <Box sx={{ p: 2, pt: 1, flexGrow: 1, minWidth: 0 }}>
        <CodeBlock code={snippet.code} language={snippet.language} maxHeight={360} />
      </Box>
    </Card>
  );
}
