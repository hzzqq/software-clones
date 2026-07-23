import { useState } from 'react';
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
import { visibilityLabel, formatRelativeTime, countChars } from '../utils/notes';

interface Props {
  note: Note;
  onEdit: (note: Note) => void;
  onArchive: (note: Note) => void;
  onUnarchive?: (note: Note) => void;
  onPin: (note: Note) => void;
  onUnpin: (note: Note) => void;
  onDelete: (note: Note) => void;
  onTagClick?: (tag: string) => void;
}

const visColor: Record<Note['visibility'], 'success' | 'warning' | 'default'> = {
  public: 'success',
  protected: 'warning',
  private: 'default',
};

export default function NoteCard(props: Props): JSX.Element {
  const { note } = props;
  const [copied, setCopied] = useState(false);

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
            {note.pinned ? ' · 📌' : ''} · {countChars(note.content)} 字
          </Typography>
        </Stack>
        <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{note.content}</Typography>
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
