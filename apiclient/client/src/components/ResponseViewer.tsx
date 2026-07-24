import { useState } from 'react';
import { Box, Chip, Typography, Tabs, Tab, Stack, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import type { ProxyResponse } from '../types';
import { statusKind, statusFamily, tryPrettyJson, headersToText, byteLengthOf, formatBytes } from '../utils/http';

interface Props {
  response: ProxyResponse | null;
  loading: boolean;
}

export default function ResponseViewer({ response, loading }: Props): JSX.Element {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyBody = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(tab === 1 ? tryPrettyJson(response.body) : response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默 */
    }
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
  const displayBody = tab === 1 ? tryPrettyJson(response.body) : response.body;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.5 }}>
        <Chip
          label={response.status === 0 ? 'NETWORK ERROR' : `${response.status} ${response.statusText}`}
          color={kind === 'success' ? 'success' : kind === 'warning' ? 'warning' : kind === 'info' ? 'info' : 'error'}
          size="small"
        />
        <Chip
          label={statusFamily(response.status)}
          color={kind === 'success' ? 'success' : kind === 'warning' ? 'warning' : kind === 'info' ? 'info' : 'error'}
          size="small"
          variant="outlined"
        />
        <Typography variant="caption" color="text.secondary">
          {response.timeMs} ms · {formatBytes(byteLengthOf(response.body))}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={copied ? '已复制' : '复制内容'}>
          <IconButton size="small" onClick={copyBody} aria-label="复制响应内容">
            {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
        <Tab label="Body" />
        <Tab label="Headers" />
      </Tabs>
      <Box sx={{ p: 1.5, maxHeight: 420, overflow: 'auto' }}>
        {tab === 0 ? (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{displayBody}</pre>
        ) : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{headersToText(response.headers)}</pre>
        )}
      </Box>
    </Box>
  );
}
