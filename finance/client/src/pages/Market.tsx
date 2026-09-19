import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { financeApi, Quote, Ticker, Watchlist } from '../api/finance';

function fmt(n: number | null, digits = 2): string {
  return n == null ? '-' : n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// A股惯例：涨红跌绿
function changeColor(change: number | null): string {
  if (change == null || change === 0) return 'text.secondary';
  return change > 0 ? '#ff4d4f' : '#00d486';
}

export default function Market(): JSX.Element {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tickers, setTickers] = useState<Record<number, Ticker>>({});
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      const [q, t, w] = await Promise.all([
        financeApi.listQuotes(),
        financeApi.listTickers(),
        financeApi.listWatchlists(),
      ]);
      setQuotes(q);
      const map: Record<number, Ticker> = {};
      t.forEach((x) => (map[x.id] = x));
      setTickers(map);
      setWatchlists(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.symbol === selected) ?? null,
    [quotes, selected],
  );

  const tickerName = (symbol: string): string => {
    const t = Object.values(tickers).find((x) => x.symbol === symbol);
    return t ? t.name : symbol;
  };

  const onRefresh = async (): Promise<void> => {
    await financeApi.refresh();
    await load();
  };

  const onAddWatchlist = async (): Promise<void> => {
    const name = window.prompt('自选清单名称', 'My Watchlist');
    if (!name) return;
    await financeApi.createWatchlist(name);
    await load();
  };

  const onAddToWatchlist = async (wlId: number, symbol: string): Promise<void> => {
    const ticker = Object.values(tickers).find((x) => x.symbol === symbol);
    if (!ticker) return;
    await financeApi.addToWatchlist(wlId, ticker.id);
    await load();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="h4" fontWeight={700}>
          金融终端
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onRefresh}>
            刷新行情
          </Button>
          <Button variant="contained" onClick={onAddWatchlist}>
            新建自选
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>代码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell align="right">最新价</TableCell>
              <TableCell align="right">涨跌</TableCell>
              <TableCell align="right">涨跌幅</TableCell>
              <TableCell align="right">成交量</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotes.map((q) => (
              <TableRow
                key={q.symbol}
                hover
                selected={selected === q.symbol}
                onClick={() => setSelected(q.symbol)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{q.symbol}</TableCell>
                <TableCell>{tickerName(q.symbol)}</TableCell>
                <TableCell>
                  <Chip label={q.symbol.includes('.') || /^[A-Z]{3,}$/.test(q.symbol) ? q.type : q.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="right">{fmt(q.price)}</TableCell>
                <TableCell align="right" sx={{ color: changeColor(q.change), fontWeight: 600 }}>
                  {q.change == null ? '-' : (q.change > 0 ? '+' : '') + fmt(q.change)}
                </TableCell>
                <TableCell align="right" sx={{ color: changeColor(q.changePct), fontWeight: 600 }}>
                  {q.changePct == null ? '-' : (q.changePct > 0 ? '+' : '') + fmt(q.changePct) + '%'}
                </TableCell>
                <TableCell align="right">{q.volume == null ? '-' : fmt(q.volume, 0)}</TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={(e) => { e.stopPropagation(); onAddToWatchlist(watchlists[0]?.id ?? -1, q.symbol); }}>
                    加入自选
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            自选清单
          </Typography>
          {watchlists.length === 0 ? (
            <Alert severity="info">还没有自选清单，点右上角「新建自选」。</Alert>
          ) : (
            <Stack spacing={1}>
              {watchlists.map((wl) => (
                <Paper key={wl.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography fontWeight={600}>{wl.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {wl.count ?? 0} 只标的
                      </Typography>
                    </Box>
                    <Button size="small" color="error" onClick={async () => { await financeApi.deleteWatchlist(wl.id); await load(); }}>
                      删除
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            个股简表
          </Typography>
          {!selectedQuote ? (
            <Alert severity="info">在行情表中点击一行查看详情。</Alert>
          ) : (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={700}>
                {selectedQuote.symbol}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {tickerName(selectedQuote.symbol)}
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography>最新价：<b>{fmt(selectedQuote.price)}</b></Typography>
                <Typography sx={{ color: changeColor(selectedQuote.change) }}>
                  涨跌：{(selectedQuote.change ?? 0) > 0 ? '+' : ''}
                  {fmt(selectedQuote.change)}
                </Typography>
                <Typography sx={{ color: changeColor(selectedQuote.changePct) }}>
                  涨跌幅：{(selectedQuote.changePct ?? 0) > 0 ? '+' : ''}
                  {fmt(selectedQuote.changePct)}%
                </Typography>
                <Typography>成交量：{selectedQuote.volume == null ? '-' : fmt(selectedQuote.volume, 0)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  快照时间：{new Date(selectedQuote.fetchedAt).toLocaleString()}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Box>
      </Stack>
    </Stack>
  );
}
