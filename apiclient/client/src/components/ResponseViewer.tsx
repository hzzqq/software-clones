import { useState } from 'react';
import { Box, Chip, Typography, Tabs, Tab, Stack } from '@mui/material';
import type { ProxyResponse } from '../types';
import { statusKind, tryPrettyJson, headersToText } from '../utils/http';

interface Props {
  response: ProxyResponse | null;
  loading: boolean;
}

export default function ResponseViewer({ response, loading }: Props): JSX.Element {
  const [tab, setTab] = useState(0);

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
        <Typography variant="caption" color="text.secondary">
          {response.timeMs} ms
        </Typography>
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
