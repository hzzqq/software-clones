import { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import { formatMatchCounter } from '../utils/mdFind';

interface Props {
  query: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  /** 当前命中在命中列表中的 0 基下标（-1 表示尚未定位）。 */
  matchIndex: number;
  /** 命中总数。 */
  matchTotal: number;
  onQuery: (v: string) => void;
  onReplacement: (v: string) => void;
  onCaseSensitive: (v: boolean) => void;
  onWholeWord: (v: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

/**
 * 查找 / 替换工具条（cycle 263）。
 * 支持大小写敏感、全词匹配、上一个 / 下一个跳转、替换当前、全部替换与命中计数。
 * 打开时自动聚焦查找框；Enter 跳下一个，Shift+Enter 跳上一个，Esc 关闭。
 */
export default function FindReplaceBar({
  query,
  replacement,
  caseSensitive,
  wholeWord,
  matchIndex,
  matchTotal,
  onQuery,
  onReplacement,
  onCaseSensitive,
  onWholeWord,
  onNext,
  onPrev,
  onReplaceOne,
  onReplaceAll,
  onClose,
}: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  return (
    <Box
      onKeyDown={handleKeyDown}
      sx={{
        p: 1,
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="查找"
          value={query}
          inputRef={inputRef}
          onChange={(e) => onQuery(e.target.value)}
          sx={{ width: 200 }}
        />
        <TextField
          size="small"
          label="替换为"
          value={replacement}
          onChange={(e) => onReplacement(e.target.value)}
          sx={{ width: 200 }}
        />
        <Tooltip title="上一个（Shift+Enter）">
          <span>
            <IconButton size="small" onClick={onPrev} disabled={matchTotal === 0} aria-label="上一个匹配">
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="下一个（Enter）">
          <span>
            <IconButton size="small" onClick={onNext} disabled={matchTotal === 0} aria-label="下一个匹配">
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="caption" color={matchTotal === 0 && query ? 'error' : 'text.secondary'} sx={{ minWidth: 92 }}>
          {query ? formatMatchCounter(matchIndex, matchTotal) : '输入关键词'}
        </Typography>
        <Button size="small" onClick={onReplaceOne} disabled={matchTotal === 0}>
          替换
        </Button>
        <Button size="small" onClick={onReplaceAll} disabled={matchTotal === 0}>
          全部替换
        </Button>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={caseSensitive}
              onChange={(e) => onCaseSensitive(e.target.checked)}
            />
          }
          label={<Typography variant="caption">大小写敏感</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox size="small" checked={wholeWord} onChange={(e) => onWholeWord(e.target.checked)} />
          }
          label={<Typography variant="caption">全词匹配</Typography>}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="关闭（Esc）">
          <IconButton size="small" onClick={onClose} aria-label="关闭查找替换">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
