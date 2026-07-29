import { useEffect, useState, Fragment } from 'react';
import {
  Box,
  Typography,
  Stack,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Alert,
  CircularProgress,
  InputAdornment,
  Switch,
  FormControlLabel,
  ListSubheader,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { proxyApi } from '../api/proxy';
import { requestApi } from '../api/requests';
import { historyApi } from '../api/history';
import type { HttpMethod, ProxyResponse, SavedRequest, HistoryItem } from '../types';
import RequestBuilder from '../components/RequestBuilder';
import ResponseViewer from '../components/ResponseViewer';
import { parseHeadersText, parseKeyValueText, headersToText as h2t, matchRequest, matchHistory, buildCurlCommand, sortRequests, groupByMethod, buildUrlWithQuery, statusText, statusFamily, methodColor, type RequestSort } from '../utils/http';

interface Draft {
  method: HttpMethod;
  url: string;
  paramsText: string;
  headersText: string;
  body: string;
}

const EMPTY: Draft = { method: 'GET', url: '', paramsText: '', headersText: '', body: '' };

export default function ApiClientPage(): JSX.Element {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sideTab, setSideTab] = useState(0);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sideQuery, setSideQuery] = useState('');
  const [sideSort, setSideSort] = useState<RequestSort>('name');
  const [sideGroup, setSideGroup] = useState(false);
  const [name, setName] = useState('');
  const [curlCopied, setCurlCopied] = useState(false);

  const refreshRequests = async () => {
    try {
      setRequests(await requestApi.list());
    } catch {
      /* ignore */
    }
  };
  const refreshHistory = async () => {
    try {
      setHistory(await historyApi.list());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refreshRequests();
    void refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const sideNeedle = sideQuery.trim().toLowerCase();
  const filteredRequests = requests.filter((r) => matchRequest(sideNeedle, r));
  const filteredHistory = history.filter((h) => matchHistory(sideNeedle, h));
  const sortedRequests = sortRequests(filteredRequests, sideSort);
  const sortedHistory = sortRequests(filteredHistory, sideSort);
  const resolvedUrl = buildUrlWithQuery(draft.url, parseKeyValueText(draft.paramsText));

  const send = async () => {
    if (!draft.url.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const resp = await proxyApi.send({
        method: draft.method,
        url: draft.url,
        params: parseKeyValueText(draft.paramsText),
        headers: parseHeadersText(draft.headersText),
        body: draft.body,
      });
      setResponse(resp);
      void refreshHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadSaved = (r: SavedRequest) => {
    setDraft({
      method: r.method,
      url: r.url,
      paramsText: Object.entries(r.params)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n'),
      headersText: h2t(r.headers),
      body: r.body,
    });
    setName(r.name || '');
  };

  const save = async () => {
    try {
      await requestApi.create({
        name: name || undefined,
        method: draft.method,
        url: draft.url,
        params: parseKeyValueText(draft.paramsText),
        headers: parseHeadersText(draft.headersText),
        body: draft.body,
      });
      setName('');
      void refreshRequests();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeSaved = async (id: number) => {
    try {
      await requestApi.remove(id);
      void refreshRequests();
    } catch {
      /* ignore */
    }
  };

  const loadHistory = (h: HistoryItem) => {
    setDraft((d) => ({ ...d, method: h.method, url: h.url }));
  };

  const clearHistory = async () => {
    try {
      await historyApi.clear();
      void refreshHistory();
    } catch {
      /* ignore */
    }
  };

  const copyCurl = async () => {
    if (!draft.url.trim()) return;
    const cmd = buildCurlCommand({
      method: draft.method,
      url: draft.url,
      headers: parseHeadersText(draft.headersText),
      params: parseKeyValueText(draft.paramsText),
      body: draft.body || undefined,
    });
    try {
      await navigator.clipboard.writeText(cmd);
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 1500);
    } catch {
      setError('复制失败，请检查浏览器剪贴板权限');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* 侧栏 */}
      <Box sx={{ width: 300, borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <Tabs value={sideTab} onChange={(_e, v) => setSideTab(v)}>
          <Tab icon={<FolderOutlinedIcon />} label="集合" />
          <Tab icon={<HistoryIcon />} label="历史" />
        </Tabs>
        <Box sx={{ p: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="筛选集合 / 历史…"
            value={sideQuery}
            onChange={(e) => setSideQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: sideQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSideQuery('')} aria-label="清空筛选">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>
        <Box sx={{ px: 1, pb: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="side-sort-label">排序</InputLabel>
            <Select
              labelId="side-sort-label"
              label="排序"
              value={sideSort}
              onChange={(e) => setSideSort(e.target.value as RequestSort)}
            >
              <MenuItem value="name">按名称</MenuItem>
              <MenuItem value="method">按方法</MenuItem>
              <MenuItem value="createdAt">按创建时间</MenuItem>
              <MenuItem value="updatedAt">按更新时间</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Switch size="small" checked={sideGroup} onChange={(e) => setSideGroup(e.target.checked)} />} label="按方法分组" />
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {sideTab === 0 ? (
            <List dense>
              {requests.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  暂无保存的请求。
                </Typography>
              )}
              {sideGroup
                ? Object.entries(groupByMethod(sortedRequests)).map(([method, items]) => (
                    <Fragment key={method}>
                      <ListSubheader disableSticky sx={{ bgcolor: 'transparent', lineHeight: 2 }}>
                        {method}（{items.length}）
                      </ListSubheader>
                      {items.map((r) => (
                        <ListItemButton key={r.id} onClick={() => loadSaved(r)}>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Chip size="small" label={r.method} color={methodColor(r.method)} />
                                <Typography noWrap>{r.name || r.url}</Typography>
                              </Stack>
                            }
                            secondary={r.url}
                            secondaryTypographyProps={{ noWrap: true }}
                          />
                          <Tooltip title="删除">
                            <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); void removeSaved(r.id); }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemButton>
                      ))}
                    </Fragment>
                  ))
                : sortedRequests.map((r) => (
                    <ListItemButton key={r.id} onClick={() => loadSaved(r)}>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Chip size="small" label={r.method} color={methodColor(r.method)} />
                            <Typography noWrap>{r.name || r.url}</Typography>
                          </Stack>
                        }
                        secondary={r.url}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                      <Tooltip title="删除">
                        <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); void removeSaved(r.id); }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemButton>
                  ))}
            </List>
          ) : (
            <List dense>
              {history.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  暂无历史。
                </Typography>
              )}
              {sortedHistory.map((h) => (
                <ListItemButton key={h.id} onClick={() => loadHistory(h)}>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip size="small" label={h.method} color={methodColor(h.method)} />
                        <Typography noWrap>{h.url}</Typography>
                      </Stack>
                    }
                    secondary={`${h.status} ${statusText(h.status)} · ${statusFamily(h.status)} · ${h.timeMs}ms`}
                  />
                </ListItemButton>
              ))}
              {history.length > 0 && (
                <Button size="small" color="error" onClick={clearHistory} sx={{ m: 1 }}>
                  清空历史
                </Button>
              )}
            </List>
          )}
        </Box>
      </Box>

      {/* 主区 */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {error && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <RequestBuilder
            method={draft.method}
            url={draft.url}
            paramsText={draft.paramsText}
            headersText={draft.headersText}
            body={draft.body}
            loading={loading}
            onMethod={(m) => set({ method: m })}
            onUrl={(u) => set({ url: u })}
            onParams={(t) => set({ paramsText: t })}
            onHeaders={(t) => set({ headersText: t })}
            onBody={(b) => set({ body: b })}
            onSend={send}
          />
          <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, pb: 1 }}>
            <TextField size="small" label="名称（可选）" value={name} onChange={(e) => setName(e.target.value)} sx={{ width: 200 }} />
            <Button variant="outlined" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={!draft.url.trim()}>
              保存到集合
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={copyCurl}
              disabled={!draft.url.trim()}
              color={curlCopied ? 'success' : 'primary'}
            >
              {curlCopied ? '已复制 cURL' : '复制 cURL'}
            </Button>
            {loading && <CircularProgress size={18} />}
          </Stack>
          {draft.url.trim() && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, pb: 1, display: 'block', wordBreak: 'break-all' }}>
              请求 URL：{resolvedUrl}
            </Typography>
          )}
        </Box>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <ResponseViewer response={response} loading={loading} />
        </Box>
      </Box>
    </Box>
  );
}
