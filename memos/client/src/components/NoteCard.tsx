import { Fragment, useState } from 'react';
import {
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Note } from '../types';
import { visibilityLabel, formatRelativeTime, countChars, countWords, formatCharCount, estimateReading, extractTitle, truncatePreview, highlightSegments } from '../utils/notes';

interface Props {
  note: Note;
  onEdit: (note: Note) => void;
  onArchive: (note: Note) => void;
  onUnarchive?: (note: Note) => void;
  onPin: (note: Note) => void;
  onUnpin: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTagClick?: (tag: string) => void;
  /** 高亮词（通常来自搜索框）：命中片段用 <mark> 包裹渲染，留空不高亮。 */
  highlight?: string;
}

const visColor: Record<Note['visibility'], 'success' | 'warning' | 'default'> = {
  public: 'success',
  protected: 'warning',
  private: 'default',
};

/** 安全渲染高亮：命中片段用 <mark> 包裹，避免 dangerouslySetInnerHTML 的 XSS 风险。 */
function renderHighlighted(text: string, query: string): JSX.Element | string {
  const segs = highlightSegments(text, query);
  if (segs.length === 1 && !segs[0].match) return text;
  return (
    <>
      {segs.map((s, i) =>
        s.match ? (
          <mark key={i} style={{ background: 'rgba(255,213,0,0.55)', padding: '0 1px', borderRadius: 2 }}>
            {s.text}
          </mark>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        )
      )}
    </>
  );
}

export default function NoteCard(props: Props): JSX.Element {
  const { note } = props;
  const [copied, setCopied] = useState(false);
  const reading = estimateReading(note.content);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Chip size="small" label={visibilityLabel(note.visibility)} color={visColor[note.visibility]} />
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(note.createdAt)}
            {note.pinned ? ' · 📌' : ''} · {formatCharCount(countChars(note.content))} 字 · {countWords(note.content)} 词
            {reading > 0 ? ` · 约 ${reading} 分钟` : ''}
          </Typography>
        </Stack>
        {(() => {
          const title = extractTitle(note.content);
          const preview = truncatePreview(note.content);
          const hl = props.highlight ?? '';
          return (
            <>
              {title && (
                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
                  {renderHighlighted(title, hl)}
                </Typography>
              )}
              <Typography
                sx={{ whiteSpace: 'pre-wrap', mt: title ? 0.5 : 1 }}
                color={preview ? 'text.primary' : 'text.secondary'}
              >
                {preview ? renderHighlighted(preview, hl) : '（空笔记）'}
              </Typography>
            </>
          );
        })()}
        {note.tags.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {note.tags.map((t) => (
              <Chip
                key={t}
                size="small"
                variant="outlined"
                label={`#${t}`}
                clickable={!!props.onTagClick}
                onClick={props.onTagClick ? () => props.onTagClick?.(t) : undefined}
              />
            ))}
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Tooltip title={copied ? '已复制' : '复制内容'}>
            <IconButton size="small" onClick={() => void copy()} color={copied ? 'success' : 'default'}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="编辑">
            <IconButton size="small" onClick={() => props.onEdit(note)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={note.pinned ? '取消置顶' : '置顶'}>
            <IconButton
              size="small"
              onClick={() => (note.pinned ? props.onUnpin(note) : props.onPin(note))}
            >
              <PushPinOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {note.archived ? (
            <Tooltip title="移出归档">
              <IconButton size="small" onClick={() => props.onUnarchive?.(note)}>
                <UnarchiveOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="归档">
              <IconButton size="small" onClick={() => props.onArchive(note)}>
                <ArchiveOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="删除">
            <IconButton size="small" color="error" onClick={() => props.onDelete(note)}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardContent>
    </Card>
  );
}
