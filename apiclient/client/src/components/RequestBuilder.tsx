import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputAdornment,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import type { HttpMethod } from '../types';
import { isValidHttpUrl } from '../utils/http';

interface Props {
  method: HttpMethod;
  url: string;
  paramsText: string;
  headersText: string;
  body: string;
  loading: boolean;
  onMethod: (m: HttpMethod) => void;
  onUrl: (u: string) => void;
  onParams: (t: string) => void;
  onHeaders: (t: string) => void;
  onBody: (b: string) => void;
  onSend: () => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function RequestBuilder({
  method,
  url,
  paramsText,
  headersText,
  body,
  loading,
  onMethod,
  onUrl,
  onParams,
  onHeaders,
  onBody,
  onSend,
}: Props): JSX.Element {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
        <Select
          size="small"
          value={method}
          onChange={(e) => onMethod(e.target.value as HttpMethod)}
          sx={{ minWidth: 110 }}
        >
          {METHODS.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </Select>
        <TextField
          fullWidth
          size="small"
          placeholder="https://api.example.com/endpoint"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          error={url.trim() !== '' && !isValidHttpUrl(url)}
          helperText={
            url.trim() !== '' && !isValidHttpUrl(url)
              ? '请输入合法的 http(s) 地址'
              : ' '
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  variant="contained"
                  onClick={onSend}
                  disabled={loading || !isValidHttpUrl(url)}
                  startIcon={<SendIcon />}
                >
                  发送
                </Button>
              </InputAdornment>
            ),
          }}
        />
      </Stack>
      <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
        <Tab label="Params" />
        <Tab label="Headers" />
        <Tab label="Body" />
      </Tabs>
      <Box sx={{ p: 1.5 }}>
        {tab === 0 && (
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder={'每行一个：key=value'}
            value={paramsText}
            onChange={(e) => onParams(e.target.value)}
          />
        )}
        {tab === 1 && (
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder={'每行一个：Key: Value'}
            value={headersText}
            onChange={(e) => onHeaders(e.target.value)}
          />
        )}
        {tab === 2 && (
          <TextField
            fullWidth
            multiline
            minRows={6}
            placeholder={'请求体（JSON / 文本）'}
            value={body}
            onChange={(e) => onBody(e.target.value)}
          />
        )}
      </Box>
    </Box>
  );
}
