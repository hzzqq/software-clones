import {
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useState } from 'react';
import { Board, Tag, PRIORITY_LABELS } from '../types';
import TagEditDialog from './TagEditDialog';

interface ToolbarProps {
  board: Board;
  tags: Tag[];
  filterTagId: number | null;
  onFilterChange: (tagId: number | null) => void;
  filterPriority: number | null;
  onFilterPriorityChange: (p: number | null) => void;
  onlyIncomplete: boolean;
  onOnlyIncompleteChange: (v: boolean) => void;
  onDeleteBoard: () => void;
  onTagsChanged: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearCompleted: () => void;
  totalCards?: number;
  completedCards?: number;
  priorityCounts?: Record<number, number>;
  tagCounts?: Record<number, number>;
  dueSoonCount?: number;
  overdueCount?: number;
}

/** Board header: name, tag filter, edit tags, and delete. */
export default function Toolbar({
  board,
  tags,
  filterTagId,
  onFilterChange,
  filterPriority,
  onFilterPriorityChange,
  onlyIncomplete,
  onOnlyIncompleteChange,
  onDeleteBoard,
  onTagsChanged,
  searchQuery,
  onSearchChange,
  onClearCompleted,
  totalCards,
  completedCards,
  priorityCounts,
  tagCounts,
  dueSoonCount,
  overdueCount,
}: ToolbarProps): JSX.Element {
  const [editOpen, setEditOpen] = useState<boolean>(false);
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ md: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {board.name}
        </Typography>
        {typeof totalCards === 'number' && (
          <Typography variant="caption" color="text.secondary">
            共 {totalCards} 张 · 已完成 {completedCards ?? 0} 张
          </Typography>
        )}
        {priorityCounts && Object.keys(priorityCounts).length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            {Object.entries(priorityCounts)
              .map(([p, n]) => [Number(p), n] as [number, number])
              .sort((a, b) => b[0] - a[0])
              .map(([p, n]) => (
                <Chip key={p} size="small" variant="outlined" label={`P${p}: ${n}`} />
              ))}
          </Stack>
        )}
        {typeof dueSoonCount === 'number' && dueSoonCount > 0 && (
          <Chip size="small" color="warning" sx={{ mt: 0.5 }} label={`${dueSoonCount} 项临期`} />
        )}
        {tagCounts && Object.keys(tagCounts).length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} alignItems="center">
            {Object.entries(tagCounts)
              .sort((a, b) => Number(b[1]) - Number(a[1]))
              .slice(0, 5)
              .map(([id, n]) => {
                const tag = tags.find((t) => t.id === Number(id));
                const label = tag ? `#${tag.name}` : `#${id}`;
                return (
                  <Chip
                    key={id}
                    size="small"
                    variant="outlined"
                    label={`${label}: ${n}`}
                    sx={tag ? { borderColor: tag.color, color: tag.color } : undefined}
                  />
                );
              })}
          </Stack>
        )}
        {typeof overdueCount === 'number' && overdueCount > 0 && (
          <Chip size="small" color="error" sx={{ mt: 0.5 }} label={`${overdueCount} 项逾期`} />
        )}
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          placeholder="搜索卡片…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ minWidth: 160 }}
        />
        <Button
          variant="outlined"
          startIcon={<EditNoteIcon />}
          onClick={() => setEditOpen(true)}
        >
          编辑标签
        </Button>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>按标签筛选</InputLabel>
          <Select
            label="按标签筛选"
            value={filterTagId ?? ''}
            onChange={(e) => onFilterChange(e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">全部</MenuItem>
            {tags.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>按优先级筛选</InputLabel>
          <Select
            label="按优先级筛选"
            value={filterPriority ?? ''}
            onChange={(e) => onFilterPriorityChange(e.target.value === '' ? null : Number(e.target.value))}
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(PRIORITY_LABELS).map(([p, label]) => (
              <MenuItem key={p} value={Number(p)}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={onlyIncomplete}
              onChange={(e) => onOnlyIncompleteChange(e.target.checked)}
            />
          }
          label="仅未完成"
        />
        <Button
          color="warning"
          variant="outlined"
          onClick={onClearCompleted}
          disabled={(completedCards ?? 0) === 0}
        >
          清除已完成
        </Button>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={onDeleteBoard}
        >
          删除看板
        </Button>
      </Stack>
      <TagEditDialog
        open={editOpen}
        tags={tags}
        onClose={() => setEditOpen(false)}
        onSaved={onTagsChanged}
      />
    </Stack>
  );
}
