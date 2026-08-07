import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import { useState } from 'react';
import { Board, Tag, PRIORITY_LABELS } from '../types';
import {
  DUE_RANGE_LABELS,
  hasActiveFilters,
  type CardFilterCriteria,
  type DueRange,
  type TagMatchMode,
} from '../utils/filterCards';
import TagEditDialog from './TagEditDialog';

interface ToolbarProps {
  board: Board;
  tags: Tag[];
  /** 当前组合筛选条件（唯一数据源，UI 只读不改）。 */
  criteria: CardFilterCriteria;
  /** 增量更新筛选条件。 */
  onCriteriaChange: (patch: Partial<CardFilterCriteria>) => void;
  /** 一键清空全部筛选条件。 */
  onResetFilters: () => void;
  onDeleteBoard: () => void;
  onTagsChanged: () => void;
  onClearCompleted: () => void;
  onCopySummary: () => void;
  /** 当前筛选条件下可见的卡片数，用于「显示 N / M 张」提示。 */
  visibleCards?: number;
  totalCards?: number;
  completedCards?: number;
  completionPercent?: number;
  priorityCounts?: Record<number, number>;
  tagCounts?: Record<number, number>;
  dueSoonCount?: number;
  overdueCount?: number;
}

/** Board header: name, statistics, combined filters, tag editing and delete. */
export default function Toolbar({
  board,
  tags,
  criteria,
  onCriteriaChange,
  onResetFilters,
  onDeleteBoard,
  onTagsChanged,
  onClearCompleted,
  onCopySummary,
  visibleCards,
  totalCards,
  completedCards,
  completionPercent,
  priorityCounts,
  tagCounts,
  dueSoonCount,
  overdueCount,
}: ToolbarProps): JSX.Element {
  const [editOpen, setEditOpen] = useState<boolean>(false);

  const selectedTagIds: number[] = criteria.tagIds ?? [];
  const tagMode: TagMatchMode = criteria.tagMode ?? 'or';
  const dueRange: DueRange = criteria.dueRange ?? 'all';
  const filtersActive: boolean = hasActiveFilters(criteria);
  const filtered: boolean =
    typeof visibleCards === 'number' &&
    typeof totalCards === 'number' &&
    visibleCards !== totalCards;

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'flex-start' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {board.name}
          </Typography>
          {typeof totalCards === 'number' && (
            <Typography variant="caption" color="text.secondary">
              共 {totalCards} 张 · 已完成 {completedCards ?? 0} 张
              {typeof completionPercent === 'number' && (
                <Chip
                  size="small"
                  color={completionPercent === 100 ? 'success' : 'primary'}
                  variant="outlined"
                  sx={{ ml: 1 }}
                  label={`完成率 ${completionPercent}%`}
                />
              )}
              {filtered && (
                <Chip
                  size="small"
                  color="info"
                  sx={{ ml: 1 }}
                  label={`筛选后 ${visibleCards} / ${totalCards} 张`}
                />
              )}
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
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={() => setEditOpen(true)}>
            编辑标签
          </Button>
          <Button
            color="warning"
            variant="outlined"
            onClick={onClearCompleted}
            disabled={(completedCards ?? 0) === 0}
          >
            清除已完成
          </Button>
          <Button variant="outlined" onClick={onCopySummary}>
            复制摘要
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
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="搜索标题 / 描述 / 标签 / 指派人 / 子任务…"
          value={criteria.query ?? ''}
          onChange={(e) => onCriteriaChange({ query: e.target.value })}
          sx={{ minWidth: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="tag-filter-label">按标签筛选</InputLabel>
          <Select
            labelId="tag-filter-label"
            label="按标签筛选"
            multiple
            value={selectedTagIds}
            onChange={(e) => {
              const raw = e.target.value;
              const next: number[] =
                typeof raw === 'string'
                  ? raw.split(',').filter(Boolean).map(Number)
                  : (raw as number[]);
              onCriteriaChange({ tagIds: next });
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(selected as number[]).map((id) => {
                  const tag = tags.find((t) => t.id === id);
                  return (
                    <Chip
                      key={id}
                      size="small"
                      variant="outlined"
                      label={tag ? tag.name : `#${id}`}
                      sx={tag ? { borderColor: tag.color, color: tag.color } : undefined}
                    />
                  );
                })}
              </Box>
            )}
          >
            {tags.length === 0 && <MenuItem disabled>暂无标签</MenuItem>}
            {tags.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Checkbox size="small" checked={selectedTagIds.includes(t.id)} />
                <ListItemText primary={t.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedTagIds.length > 1 && (
          <Tooltip title="多个标签的组合方式">
            <ToggleButtonGroup
              size="small"
              exclusive
              value={tagMode}
              onChange={(_, v) => {
                if (v === 'and' || v === 'or') onCriteriaChange({ tagMode: v });
              }}
            >
              <ToggleButton value="or">任一</ToggleButton>
              <ToggleButton value="and">全部</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        )}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="priority-filter-label">按优先级筛选</InputLabel>
          <Select
            labelId="priority-filter-label"
            label="按优先级筛选"
            value={criteria.priority ?? ''}
            onChange={(e) =>
              onCriteriaChange({
                priority: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(PRIORITY_LABELS).map(([p, label]) => (
              <MenuItem key={p} value={Number(p)}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="due-filter-label">按截止日筛选</InputLabel>
          <Select
            labelId="due-filter-label"
            label="按截止日筛选"
            value={dueRange}
            onChange={(e) => onCriteriaChange({ dueRange: e.target.value as DueRange })}
          >
            {(Object.keys(DUE_RANGE_LABELS) as DueRange[]).map((r) => (
              <MenuItem key={r} value={r}>
                {DUE_RANGE_LABELS[r]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={criteria.onlyIncomplete ?? false}
              onChange={(e) => onCriteriaChange({ onlyIncomplete: e.target.checked })}
            />
          }
          label="仅未完成"
        />
        {filtersActive && (
          <Button
            size="small"
            color="inherit"
            startIcon={<FilterAltOffIcon />}
            onClick={onResetFilters}
          >
            清除筛选
          </Button>
        )}
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
