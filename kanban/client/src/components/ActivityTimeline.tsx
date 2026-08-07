import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Activity } from '../types';
import {
  ACTIVITY_COLORS,
  MAX_COMMENT_LENGTH,
  activityKindLabel,
  formatActivityText,
  formatAuthor,
  groupActivitiesByDay,
  isComment,
  summarizeActivity,
  validateComment,
  type ActivityGroup,
} from '../utils/activity';
import { formatRelativeTime } from '../utils/time';

interface ActivityTimelineProps {
  cardId: number;
  /** 拉取时间线；由 useBoard 注入，返回空数组表示失败或为空。 */
  onLoad: (cardId: number) => Promise<Activity[]>;
  /** 发表评论；返回创建结果，null 表示失败。 */
  onAddComment: (cardId: number, text: string, author: string) => Promise<Activity | null>;
  /** 删除评论；返回是否成功。 */
  onRemoveComment: (cardId: number, activityId: number) => Promise<boolean>;
}

/**
 * 卡片活动与评论时间线。
 *
 * 系统事件（创建 / 移动 / 改期 / 优先级 / 指派 / 完成 / 批量）由服务端自动记录，
 * 与用户评论共用同一条倒序时间线，按自然日分组展示。
 * 只有评论可以删除，系统事件作为审计线索保留。
 */
export default function ActivityTimeline({
  cardId,
  onLoad,
  onAddComment,
  onRemoveComment,
}: ActivityTimelineProps): JSX.Element {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [draft, setDraft] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hint, setHint] = useState<string>('');

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    const data: Activity[] = await onLoad(cardId);
    setItems(data);
    setLoading(false);
  }, [cardId, onLoad]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = async (): Promise<void> => {
    const check = validateComment(draft);
    if (!check.ok) {
      setHint(check.error);
      return;
    }
    setSubmitting(true);
    const created: Activity | null = await onAddComment(cardId, check.value, author.trim());
    setSubmitting(false);
    if (!created) {
      setHint('发表失败，请稍后重试');
      return;
    }
    // 本地前插而不是整体重拉：评论是高频动作，重拉会让时间线闪一下。
    setItems((prev) => [created, ...prev]);
    setDraft('');
    setHint('');
  };

  const remove = async (activity: Activity): Promise<void> => {
    const ok: boolean = await onRemoveComment(cardId, activity.id);
    if (ok) setItems((prev) => prev.filter((a) => a.id !== activity.id));
    else setHint('删除失败，请稍后重试');
  };

  const groups: ActivityGroup[] = groupActivitiesByDay(items);
  const summary = summarizeActivity(items);
  const over: boolean = draft.trim().length > MAX_COMMENT_LENGTH;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">活动与评论</Typography>
        <Chip size="small" variant="outlined" label={`评论 ${summary.comments}`} />
        <Chip size="small" variant="outlined" label={`事件 ${summary.events}`} />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="刷新时间线">
          <span>
            <IconButton size="small" onClick={() => void refresh()} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          placeholder="写下进展、阻塞或结论…（Ctrl / ⌘ + Enter 发送）"
          value={draft}
          error={over}
          helperText={
            over
              ? `已超出 ${draft.trim().length - MAX_COMMENT_LENGTH} 字`
              : `${draft.trim().length} / ${MAX_COMMENT_LENGTH}`
          }
          onChange={(e) => {
            setDraft(e.target.value);
            if (hint) setHint('');
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <TextField
            size="small"
            placeholder="署名（可留空）"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            sx={{ maxWidth: 160 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          {hint && (
            <Typography variant="caption" color="error">
              {hint}
            </Typography>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<SendIcon fontSize="small" />}
            disabled={submitting || over || draft.trim() === ''}
            onClick={() => void submit()}
          >
            发表评论
          </Button>
        </Stack>
      </Box>

      <Divider />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={22} />
        </Box>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          暂无活动记录，卡片的创建、移动、改期等变更会自动出现在这里。
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
          {groups.map((group) => (
            <Box key={group.day}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}
              >
                {group.label}
              </Typography>
              <Stack spacing={1}>
                {group.items.map((a) => (
                  <Box
                    key={a.id}
                    sx={{
                      display: 'flex',
                      gap: 1,
                      alignItems: 'flex-start',
                      borderLeft: '2px solid',
                      borderColor: ACTIVITY_COLORS[a.kind],
                      pl: 1,
                      py: 0.25,
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {isComment(a) ? formatAuthor(a.author) : activityKindLabel(a.kind)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(a.createdAt) || '—'}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        color={isComment(a) ? 'text.primary' : 'text.secondary'}
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {formatActivityText(a)}
                      </Typography>
                    </Box>
                    {isComment(a) && (
                      <Tooltip title="删除这条评论">
                        <IconButton size="small" onClick={() => void remove(a)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
