import { Chip, Stack, Typography } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';

/** 保存状态机：已保存 / 保存中 / 有未保存改动。 */
export type SaveState = 'saved' | 'saving' | 'dirty';

interface Props {
  words: number;
  characters: number;
  lines: number;
  readingMinutes: number;
  headings: number;
  saveState: SaveState;
  /** 句数（可选，省略则不展示）。 */
  sentences?: number;
  /** 段落数（可选，省略则不展示）。 */
  paragraphs?: number;
  /** 围栏代码块数（可选，省略则不展示）。 */
  codeBlocks?: number;
}

const SAVE_LABEL: Record<SaveState, string> = {
  saved: '已保存',
  saving: '保存中…',
  dirty: '未保存',
};

const SAVE_COLOR: Record<SaveState, 'success' | 'info' | 'warning'> = {
  saved: 'success',
  saving: 'info',
  dirty: 'warning',
};

/**
 * 编辑器底部状态栏（cycle 264）。
 * 展示字数 / 字符数 / 行数 / 标题数 / 预计阅读时间，以及实时保存状态，
 * 让用户随时知道「写了多少」和「存没存上」。
 */
export default function StatusBar({
  words,
  characters,
  lines,
  readingMinutes,
  headings,
  saveState,
  sentences,
  paragraphs,
  codeBlocks,
}: Props): JSX.Element {
  const Icon =
    saveState === 'saved'
      ? CloudDoneOutlinedIcon
      : saveState === 'saving'
        ? CloudSyncOutlinedIcon
        : EditNoteOutlinedIcon;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ pt: 1, mt: 1, borderTop: '1px solid', borderColor: 'divider' }}
    >
      <Typography variant="caption" color="text.secondary">
        {words} 词
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {characters} 字符
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {lines} 行
      </Typography>
      {typeof sentences === 'number' && (
        <Typography variant="caption" color="text.secondary">
          {sentences} 句
        </Typography>
      )}
      {typeof paragraphs === 'number' && (
        <Typography variant="caption" color="text.secondary">
          {paragraphs} 段
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {headings} 个标题
      </Typography>
      {typeof codeBlocks === 'number' && (
        <Typography variant="caption" color="text.secondary">
          {codeBlocks} 个代码块
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        约 {readingMinutes} 分钟读完
      </Typography>
      <Chip
        size="small"
        variant="outlined"
        color={SAVE_COLOR[saveState]}
        icon={<Icon style={{ fontSize: 16 }} />}
        label={SAVE_LABEL[saveState]}
      />
    </Stack>
  );
}
