import { Divider, IconButton, Stack, Tooltip } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import CodeIcon from '@mui/icons-material/Code';
import DataObjectIcon from '@mui/icons-material/DataObject';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import type { MdAction, MdActionId } from '../utils/mdEdit';
import { MD_ACTIONS } from '../utils/mdEdit';

interface Props {
  /** 触发一次编辑动作（由页面负责作用于当前选区并回位光标）。 */
  onAction: (id: MdActionId) => void;
  /** 无激活笔记或处于纯预览时禁用整条工具栏。 */
  disabled?: boolean;
}

/** 动作 → 图标映射（与 MD_ACTIONS 顺序解耦，新增动作只需补一条）。 */
const ICONS: Record<MdActionId, JSX.Element> = {
  bold: <FormatBoldIcon fontSize="small" />,
  italic: <FormatItalicIcon fontSize="small" />,
  strike: <StrikethroughSIcon fontSize="small" />,
  code: <CodeIcon fontSize="small" />,
  codeblock: <DataObjectIcon fontSize="small" />,
  h1: <LooksOneIcon fontSize="small" />,
  h2: <LooksTwoIcon fontSize="small" />,
  h3: <Looks3Icon fontSize="small" />,
  ul: <FormatListBulletedIcon fontSize="small" />,
  ol: <FormatListNumberedIcon fontSize="small" />,
  task: <ChecklistIcon fontSize="small" />,
  quote: <FormatQuoteIcon fontSize="small" />,
  link: <InsertLinkIcon fontSize="small" />,
  image: <ImageOutlinedIcon fontSize="small" />,
  table: <TableChartOutlinedIcon fontSize="small" />,
  hr: <HorizontalRuleIcon fontSize="small" />,
};

/** 在这些动作「之前」插入一条分隔线，让工具栏按语义分组。 */
const GROUP_BREAK_BEFORE: ReadonlySet<MdActionId> = new Set<MdActionId>(['h1', 'ul', 'link']);

/**
 * Markdown 编辑工具栏（cycle 262）。
 * 每个按钮都对应 `MD_ACTIONS` 中的一条元数据，Tooltip 自动展示对应快捷键，
 * 保证「按钮 / 快捷键 / 帮助文档」三处描述永远一致。
 */
export default function EditorToolbar({ onAction, disabled = false }: Props): JSX.Element {
  return (
    <Stack
      direction="row"
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      spacing={0.25}
      sx={{ px: 0.5, py: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      {MD_ACTIONS.map((action: MdAction) => (
        <span key={action.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {GROUP_BREAK_BEFORE.has(action.id) && (
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.5 }} />
          )}
          <Tooltip title={action.shortcut ? `${action.label}（${action.shortcut}）` : action.label}>
            <span>
              <IconButton
                size="small"
                disabled={disabled}
                aria-label={action.label}
                onClick={() => onAction(action.id)}
              >
                {ICONS[action.id]}
              </IconButton>
            </span>
          </Tooltip>
        </span>
      ))}
    </Stack>
  );
}
