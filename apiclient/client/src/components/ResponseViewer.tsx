import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  Tabs,
  Tab,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import type { ProxyResponse } from '../types';
import {
  statusKind,
  statusFamily,
  statusText as statusTextOf,
  formatResponseBody,
  getResponseMediaType,
  headersToText,
  redactSensitiveHeaders,
  byteLengthOf,
  formatBytes,
} from '../utils/http';
import {
  flattenJson,
  filterFlatRows,
  summarizeJson,
  countOccurrences,
  filterLines,
  headerRows,
  type FlatRow,
} from '../utils/response';

interface Props {
  response: ProxyResponse | null;
  loading: boolean;
}

/** 响应体展示模式：美化（按 Content-Type 格式化）/ 原始。 */
type BodyMode = 'pretty' | 'raw';

export default function ResponseViewer({ response, loading }: Props): JSX.Element {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [bodyMode, setBodyMode] = useState<BodyMode>('pretty');
  const [needle, setNeedle] = useState('');
  const [onlyMatched, setOnlyMatched] = useState(false);

  const body = response?.body ?? '';
  const headers = useMemo(() => response?.headers ?? {}, [response]);

  const prettyBody = useMemo(() => formatResponseBody(body, headers), [body, headers]);
  const displayBody = bodyMode === 'pretty' ? prettyBody : body;
  const shownBody = onlyMatched ? filterLines(displayBody, needle) : displayBody;
  const hitCount = countOccurrences(displayBody, needle.trim());

  const safeHeaders = useMemo(() => redactSensitiveHeaders(headers), [headers]);
  const rows = useMemo(() => headerRows(safeHeaders), [safeHeaders]);
  const headerText = useMemo(() => headersToText(safeHeaders), [safeHeaders]);

  const flat: FlatRow[] | null = useMemo(() => flattenJson(prettyBody), [prettyBody]);
  const flatRows = useMemo(() => (flat ? filterFlatRows(flat, needle) : []), [flat, needle]);
  const summary = useMemo(() => summarizeJson(prettyBody), [prettyBody]);

  const copyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默 */
    }
  };

  const copyCurrent = (): void => {
    const text = tab === 0 ? shownBody : tab === 1 ? headerText : flatRows.map((r) => `${r.path} = ${r.preview}`).join('\n');
    void copyText(text);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>请求发送中…</Typography>
      </Box>
    );
  }
  if (!response) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>发送请求后在此查看响应。</Typography>
      </Box>
    );
  }

  const kind = statusKind(response.status);
  const chipColor = kind === 'success' ? 'success' : kind === 'warning' ? 'warning' : kind === 'info' ? 'info' : 'error';
  const mediaType = getResponseMediaType(headers);
  const hasStructure = flat !== null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ p: 1.5 }}>
        <Tooltip title={statusTextOf(response.status)}>
          <Chip
            label={response.status === 0 ? 'NETWORK ERROR' : `${response.status} ${response.statusText}`}
            color={chipColor}
            size="small"
          />
        </Tooltip>
        <Chip label={statusFamily(response.status)} color={chipColor} size="small" variant="outlined" />
        <Chip label={mediaType.toUpperCase()} size="small" variant="outlined" />
        <Typography variant="caption" color="text.secondary">
          {response.timeMs} ms · {formatBytes(byteLengthOf(response.body))} · {rows.length} 个响应头
          {summary.valid ? ` · ${summary.nodes} 个 JSON 节点 / 深度 ${summary.depth}` : ''}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={copied ? '已复制' : '复制当前页签内容'}>
          <IconButton size="small" onClick={copyCurrent} aria-label="复制响应内容">
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
        <Tab label="Body" />
        <Tab label={`Headers（${rows.length}）`} />
        {hasStructure && <Tab label={`结构（${flat.length}）`} />}
      </Tabs>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, pt: 1 }}>
        <TextField
          size="small"
          placeholder={tab === 2 ? '按路径 / 值筛选…' : '在响应中查找…'}
          value={needle}
          onChange={(e) => setNeedle(e.target.value)}
          sx={{ width: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: needle ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setNeedle('')} aria-label="清空查找">
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {needle.trim() && tab !== 2 && (
          <Typography variant="caption" color="text.secondary">
            命中 {hitCount} 处
          </Typography>
        )}
        {needle.trim() && tab === 2 && (
          <Typography variant="caption" color="text.secondary">
            命中 {flatRows.length} 个节点
          </Typography>
        )}
        {tab === 0 && (
          <>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={bodyMode}
              onChange={(_e, v) => {
                if (v) setBodyMode(v as BodyMode);
              }}
            >
              <ToggleButton value="pretty">美化</ToggleButton>
              <ToggleButton value="raw">原始</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButton
              size="small"
              value="onlyMatched"
              selected={onlyMatched}
              onChange={() => setOnlyMatched((v) => !v)}
              disabled={!needle.trim()}
            >
              只看匹配行
            </ToggleButton>
          </>
        )}
      </Stack>

      <Box sx={{ p: 1.5, maxHeight: 420, overflow: 'auto' }}>
        {tab === 0 && (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {shownBody || (needle.trim() ? '（没有匹配的行）' : '（空响应体）')}
          </pre>
        )}

        {tab === 1 && (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 240 }}>名称</TableCell>
                <TableCell>值</TableCell>
                <TableCell sx={{ width: 56 }} align="right">
                  复制
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="text.secondary">
                      无响应头。
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(([k, v]) => (
                <TableRow key={k} hover>
                  <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{k}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{v}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="复制该行">
                      <IconButton size="small" onClick={() => void copyText(`${k}: ${v}`)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {tab === 2 && hasStructure && (
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 300 }}>路径</TableCell>
                <TableCell sx={{ width: 80 }}>类型</TableCell>
                <TableCell>值</TableCell>
                <TableCell sx={{ width: 56 }} align="right">
                  复制
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flatRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      没有匹配的节点。
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {flatRows.map((r) => (
                <TableRow key={r.path} hover>
                  <TableCell
                    sx={{ fontFamily: 'monospace', wordBreak: 'break-all', pl: 1 + r.depth * 1.2 }}
                  >
                    {r.path}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={r.type} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{r.preview}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="复制路径">
                      <IconButton size="small" onClick={() => void copyText(r.path)}>
                        <ContentCopyIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
    </Box>
  );
}
