import { useEffect, useState, useMemo, Fragment } from 'react';
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
  ListSubheader,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HistoryIcon from '@mui/icons-material/History';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TerminalIcon from '@mui/icons-material/Terminal';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import { proxyApi } from '../api/proxy';
import { requestApi } from '../api/requests';
import { historyApi } from '../api/history';
import { environmentApi } from '../api/environments';
import type { HttpMethod, ProxyResponse, SavedRequest, HistoryItem, Environment } from '../types';
import RequestBuilder from '../components/RequestBuilder';
import ResponseViewer from '../components/ResponseViewer';
import EnvironmentBar from '../components/EnvironmentBar';
import CurlImportDialog from '../components/CurlImportDialog';
import AuthHelperDialog from '../components/AuthHelperDialog';
import RequestActionsMenu from '../components/RequestActionsMenu';
import {
  parseHeadersText,
  parseKeyValueText,
  headersToText as h2t,
  matchRequest,
  matchHistory,
  buildCurlCommand,
  sortRequests,
  groupByMethod,
  groupByFolder,
  folderNamesOf,
  buildUrlWithQuery,
  statusText,
  statusFamily,
  methodColor,
  mergeHeaders,
  type RequestSort,
} from '../utils/http';
import { interpolateTarget, missingVarsOf, type TemplateTarget } from '../utils/template';
import { keyValueToText, type CurlDraft } from '../utils/curl';
import { mergeHeadersText, mergeParamsText } from '../utils/auth';

interface Draft {
  method: HttpMethod;
  url: string;
  paramsText: string;
  headersText: string;
  body: string;
}

const EMPTY: Draft = { method: 'GET', url: '', paramsText: '', headersText: '', body: '' };

/** 侧栏集合分组方式。 */
type GroupMode = 'none' | 'method' | 'folder';

/** 每次请求附带的默认头（代理层基础头，用户填写的头会覆盖同名键）。 */
const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent': 'apiclient',
};

export default function ApiClientPage(): JSX.Element {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sideTab, setSideTab] = useState(0);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [sideQuery, setSideQuery] = useState('');
  const [sideSort, setSideSort] = useState<RequestSort>('name');
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [curlCopied, setCurlCopied] = useState(false);
  const [curlImportOpen, setCurlImportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<SavedRequest | null>(null);

  /** 当前激活环境的变量表（无激活环境时为空表，等价于不做插值）。 */
  const activeVars = useMemo<Record<string, string>>(
    () => environments.find((e) => e.active)?.variables ?? {},
    [environments],
  );

  /** 草稿中所有可含 {{变量}} 的部位。 */
  const rawTarget = useMemo<TemplateTarget>(
    () => ({
      url: draft.url,
      params: parseKeyValueText(draft.paramsText),
      headers: parseHeadersText(draft.headersText),
      body: draft.body,
    }),
    [draft.url, draft.paramsText, draft.headersText, draft.body],
  );

  /** 插值后的实际请求内容（发送 / 预览 / cURL 均以此为准）。 */
  const resolvedTarget = useMemo(
    () => interpolateTarget(rawTarget, activeVars),
    [rawTarget, activeVars],
  );
  const missingVars = useMemo(() => missingVarsOf(rawTarget, activeVars), [rawTarget, activeVars]);

  const finalHeaders = useMemo(
    () => mergeHeaders(DEFAULT_HEADERS, resolvedTarget.headers),
    [resolvedTarget.headers],
  );
  const finalHeadersEntries = Object.entries(finalHeaders);

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
  const refreshEnvironments = async () => {
    try {
      setEnvironments(await environmentApi.list());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refreshRequests();
    void refreshHistory();
    void refreshEnvironments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const sideNeedle = sideQuery.trim().toLowerCase();
  const filteredRequests = requests.filter((r) => matchRequest(sideNeedle, r));
  const filteredHistory = history.filter((h) => matchHistory(sideNeedle, h));
  const sortedRequests = sortRequests(filteredRequests, sideSort);
  const sortedHistory = sortRequests(filteredHistory, sideSort);
  const knownFolders = folderNamesOf(requests);
  const resolvedUrl = buildUrlWithQuery(resolvedTarget.url, resolvedTarget.params);

  const send = async () => {
    if (!resolvedTarget.url.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const resp = await proxyApi.send({
        method: draft.method,
        url: resolvedTarget.url,
        params: resolvedTarget.params,
        headers: resolvedTarget.headers,
        body: resolvedTarget.body,
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
    setFolder(r.folder || '');
  };

  const save = async () => {
    try {
      // 集合中保存**原始草稿**（保留 {{变量}} 占位符），这样同一请求可在不同环境复用。
      await requestApi.create({
        name: name || undefined,
        method: draft.method,
        url: draft.url,
        params: rawTarget.params,
        headers: rawTarget.headers,
        body: draft.body,
        folder: folder.trim() || undefined,
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

  /** 重命名 / 移动文件夹（复用集合 PATCH 接口）。 */
  const patchSaved = async (id: number, patch: { name?: string; folder?: string }) => {
    try {
      await requestApi.update(id, patch);
      await refreshRequests();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /** 创建副本：同内容另存一份，名称追加「副本」后缀，保留原文件夹。 */
  const duplicateSaved = async (r: SavedRequest) => {
    try {
      await requestApi.create({
        name: `${r.name || r.url} 副本`,
        method: r.method,
        url: r.url,
        headers: r.headers,
        params: r.params,
        body: r.body,
        folder: r.folder || undefined,
      });
      await refreshRequests();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const openItemMenu = (event: React.MouseEvent<HTMLElement>, r: SavedRequest) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuTarget(r);
  };

  const closeItemMenu = () => setMenuAnchor(null);

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
    if (!resolvedTarget.url.trim()) return;
    const cmd = buildCurlCommand({
      method: draft.method,
      url: resolvedTarget.url,
      headers: resolvedTarget.headers,
      params: resolvedTarget.params,
      body: resolvedTarget.body || undefined,
    });
    try {
      await navigator.clipboard.writeText(cmd);
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 1500);
    } catch {
      setError('复制失败，请检查浏览器剪贴板权限');
    }
  };

  /** cURL 导入：整体替换当前草稿（对话框已做过解析校验）。 */
  const importCurl = (parsed: CurlDraft) => {
    setDraft({
      method: (parsed.method as HttpMethod) || 'GET',
      url: parsed.url,
      paramsText: keyValueToText(parsed.params),
      headersText: h2t(parsed.headers),
      body: parsed.body,
    });
    setResponse(null);
    setError(null);
  };

  /** 鉴权助手：把生成的头 / 参数合并进当前草稿（同名覆盖，不重复追加）。 */
  const applyAuth = (headers: Record<string, string>, params: Record<string, string>) => {
    setDraft((d) => ({
      ...d,
      headersText:
        Object.keys(headers).length > 0 ? mergeHeadersText(d.headersText, headers) : d.headersText,
      paramsText:
        Object.keys(params).length > 0 ? mergeParamsText(d.paramsText, params) : d.paramsText,
    }));
  };

  const activateEnvironment = async (id: number | null) => {
    try {
      if (id === null) await environmentApi.deactivate();
      else await environmentApi.activate(id);
      await refreshEnvironments();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const createEnvironment = async (envName: string) => {
    try {
      await environmentApi.create({ name: envName, variables: {} });
      await refreshEnvironments();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const updateEnvironment = async (
    id: number,
    patch: { name?: string; variables?: Record<string, string> },
  ) => {
    try {
      await environmentApi.update(id, patch);
      await refreshEnvironments();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteEnvironment = async (id: number) => {
    try {
      await environmentApi.remove(id);
      await refreshEnvironments();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /** 集合项渲染（分组与不分组共用）。 */
  const renderRequestItem = (r: SavedRequest): JSX.Element => (
    <ListItemButton key={r.id} onClick={() => loadSaved(r)}>
      <ListItemText
        primary={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip size="small" label={r.method} color={methodColor(r.method)} />
            <Typography noWrap>{r.name || r.url}</Typography>
          </Stack>
        }
        secondary={r.folder ? `${r.folder} · ${r.url}` : r.url}
        secondaryTypographyProps={{ noWrap: true }}
      />
      <Tooltip title="更多操作">
        <IconButton edge="end" size="small" onClick={(e) => openItemMenu(e, r)} aria-label="更多操作">
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </ListItemButton>
  );

  const groupedRequests: Record<string, SavedRequest[]> | null =
    groupMode === 'method'
      ? groupByMethod(sortedRequests)
      : groupMode === 'folder'
        ? groupByFolder(sortedRequests)
        : null;

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
        <Stack direction="row" spacing={1} sx={{ px: 1, pb: 1 }}>
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
          <FormControl fullWidth size="small">
            <InputLabel id="side-group-label">分组</InputLabel>
            <Select
              labelId="side-group-label"
              label="分组"
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            >
              <MenuItem value="none">不分组</MenuItem>
              <MenuItem value="method">按方法</MenuItem>
              <MenuItem value="folder">按文件夹</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {sideTab === 0 ? (
            <List dense>
              {requests.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  暂无保存的请求。
                </Typography>
              )}
              {groupedRequests
                ? Object.entries(groupedRequests).map(([groupName, items]) => (
                    <Fragment key={groupName}>
                      <ListSubheader disableSticky sx={{ bgcolor: 'transparent', lineHeight: 2 }}>
                        {groupName}（{items.length}）
                      </ListSubheader>
                      {items.map(renderRequestItem)}
                    </Fragment>
                  ))
                : sortedRequests.map(renderRequestItem)}
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
          <EnvironmentBar
            environments={environments}
            missingVars={missingVars}
            onActivate={activateEnvironment}
            onCreate={createEnvironment}
            onUpdate={updateEnvironment}
            onDelete={deleteEnvironment}
          />
          <Divider />
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
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              最终请求头：
            </Typography>
            {finalHeadersEntries.length === 0 ? (
              <Typography variant="caption" color="text.secondary">（无）</Typography>
            ) : (
              finalHeadersEntries.map(([k, v]) => (
                <Chip key={k} size="small" variant="outlined" label={`${k}: ${v}`} />
              ))
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.5, pb: 1 }}>
            <TextField size="small" label="名称（可选）" value={name} onChange={(e) => setName(e.target.value)} sx={{ width: 180 }} />
            <TextField
              size="small"
              label="文件夹（可选）"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              sx={{ width: 180 }}
              helperText={knownFolders.length > 0 ? `已有：${knownFolders.slice(0, 3).join(' / ')}` : ' '}
            />
            <Button variant="outlined" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={!draft.url.trim()}>
              保存到集合
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={copyCurl}
              disabled={!resolvedTarget.url.trim()}
              color={curlCopied ? 'success' : 'primary'}
            >
              {curlCopied ? '已复制 cURL' : '复制 cURL'}
            </Button>
            <Button variant="outlined" startIcon={<TerminalIcon />} onClick={() => setCurlImportOpen(true)}>
              导入 cURL
            </Button>
            <Button variant="outlined" startIcon={<VpnKeyOutlinedIcon />} onClick={() => setAuthOpen(true)}>
              鉴权助手
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

      <CurlImportDialog
        open={curlImportOpen}
        onClose={() => setCurlImportOpen(false)}
        onImport={importCurl}
      />
      <AuthHelperDialog open={authOpen} onClose={() => setAuthOpen(false)} onApply={applyAuth} />
      <RequestActionsMenu
        anchorEl={menuAnchor}
        request={menuTarget}
        folders={knownFolders}
        onClose={closeItemMenu}
        onSave={patchSaved}
        onDuplicate={duplicateSaved}
        onDelete={removeSaved}
      />
    </Box>
  );
}
