import { Card, CardActionArea, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import type { Note } from '../types';
import { NOTE_COLORS } from '../types';

interface NoteCardProps {
  note: Note;
  showArchivedActions?: boolean;
  showTrashActions?: boolean;
  onEdit: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onDelete: (note: Note) => void;
  onRestore: (note: Note) => void;
}

/**
 * 彩色便签卡片：标题 + 正文/勾选清单 + 标签 + 操作按钮。
 */
export default function NoteCard({
  note,
  showArchivedActions = false,
  showTrashActions = false,
  onEdit,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onRestore,
}: NoteCardProps): JSX.Element {
  const palette = NOTE_COLORS[note.color] ?? NOTE_COLORS.default;
  const doneCount = note.items.filter((i) => i.done).length;

  return (
    <Card
      sx={{
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 2,
        height: '100%',
      }}
    >
      <CardActionArea onClick={() => onEdit(note)} sx={{ height: '100%' }}>
        <CardContent>
          {note.title ? (
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5, wordBreak: 'break-word' }}>
              {note.title}
            </Typography>
          ) : null}

          {note.items.length > 0 ? (
            <Stack spacing={0.25} sx={{ mb: 0.5 }}>
              {note.items.slice(0, 8).map((item) => (
                <Stack key={item.id} direction="row" spacing={0.5} alignItems="center">
                  <CheckBoxIcon
                    sx={{ fontSize: 16, color: item.done ? 'success.main' : 'text.disabled' }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      textDecoration: item.done ? 'line-through' : 'none',
                      color: item.done ? 'text.disabled' : 'text.primary',
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.text}
                  </Typography>
                </Stack>
              ))}
              {note.items.length > 8 ? (
                <Typography variant="caption" color="text.secondary">
                  +{note.items.length - 8} 项
                </Typography>
              ) : null}
            </Stack>
          ) : note.body ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {note.body}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled" fontStyle="italic">
              空便签
            </Typography>
          )}
        </CardContent>
      </CardActionArea>

      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ px: 1, pb: 1, flexWrap: 'wrap', gap: 0.5 }}
      >
        {note.labels.map((label) => (
          <Chip key={label} label={label} size="small" variant="outlined" />
        ))}
        {note.items.length > 0 ? (
          <Chip
            icon={<CheckBoxIcon />}
            label={`${doneCount}/${note.items.length}`}
            size="small"
            color="success"
            variant="outlined"
          />
        ) : null}
        <Stack direction="row" spacing={0.25} sx={{ ml: 'auto' }}>
          {showTrashActions ? (
            <>
              <Tooltip title="恢复">
                <IconButton size="small" onClick={() => onRestore(note)}>
                  <RestoreFromTrashIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="彻底删除">
                <IconButton size="small" color="error" onClick={() => onDelete(note)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title={note.isPinned ? '取消置顶' : '置顶'}>
                <IconButton size="small" onClick={() => onTogglePin(note)}>
                  {note.isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="编辑">
                <IconButton size="small" onClick={() => onEdit(note)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={showArchivedActions ? '取消归档' : '归档'}>
                <IconButton size="small" onClick={() => onToggleArchive(note)}>
                  {showArchivedActions ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="移入回收站">
                <IconButton size="small" color="error" onClick={() => onDelete(note)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
