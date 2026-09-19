import db from './db';

/**
 * 种子数据：约 40 个热门标的（美股龙头 + 中概 + 港股/A股），
 * 含一份**静态行情快照**，保证离线可用、零外部依赖。
 */
interface SeedRow {
  symbol: string;
  name: string;
  type: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
}

const SEED: SeedRow[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 229.87, change: 1.23, changePct: 0.54, volume: 52340000 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock', price: 428.74, change: -2.11, changePct: -0.49, volume: 18920000 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', price: 138.25, change: 3.42, changePct: 2.54, volume: 281300000 },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 352.56, change: -5.87, changePct: -1.64, volume: 91200000 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', price: 201.30, change: 0.92, changePct: 0.46, volume: 33450000 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', price: 178.42, change: 1.05, changePct: 0.59, volume: 22560000 },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', price: 585.22, change: 4.18, changePct: 0.72, volume: 13400000 },
  { symbol: 'BABA', name: '阿里巴巴集团', type: 'stock', price: 88.65, change: 1.34, changePct: 1.53, volume: 14200000 },
  { symbol: 'JD', name: '京东集团', type: 'stock', price: 32.18, change: -0.42, changePct: -1.29, volume: 8900000 },
  { symbol: 'PDD', name: '拼多多', type: 'stock', price: 105.73, change: 2.56, changePct: 2.48, volume: 11200000 },
  { symbol: 'BIDU', name: '百度', type: 'stock', price: 92.40, change: -0.88, changePct: -0.94, volume: 5600000 },
  { symbol: 'NIO', name: '蔚来', type: 'stock', price: 4.62, change: 0.11, changePct: 2.44, volume: 47800000 },
  { symbol: 'XPEV', name: '小鹏汽车', type: 'stock', price: 12.85, change: -0.23, changePct: -1.76, volume: 19200000 },
  { symbol: 'LI', name: '理想汽车', type: 'stock', price: 21.07, change: 0.34, changePct: 1.64, volume: 9100000 },
  { symbol: 'TCEHY', name: '腾讯控股(ADR)', type: 'stock', price: 52.18, change: 0.76, changePct: 1.48, volume: 3400000 },
  { symbol: 'TME', name: '腾讯音乐', type: 'stock', price: 11.92, change: -0.14, changePct: -1.16, volume: 6700000 },
  { symbol: 'NTES', name: '网易', type: 'stock', price: 98.45, change: 1.12, changePct: 1.15, volume: 2300000 },
  { symbol: '0700.HK', name: '腾讯控股', type: 'stock', price: 412.60, change: 4.20, changePct: 1.03, volume: 16400000 },
  { symbol: '9988.HK', name: '阿里巴巴(港股)', type: 'stock', price: 86.30, change: 1.10, changePct: 1.29, volume: 41200000 },
  { symbol: '600519', name: '贵州茅台', type: 'stock', price: 1485.00, change: 12.50, changePct: 0.85, volume: 3200000 },
  { symbol: '601318', name: '中国平安', type: 'stock', price: 54.28, change: -0.42, changePct: -0.77, volume: 45600000 },
  { symbol: '600036', name: '招商银行', type: 'stock', price: 39.15, change: 0.28, changePct: 0.72, volume: 38900000 },
  { symbol: '000858', name: '五粮液', type: 'stock', price: 142.60, change: -1.05, changePct: -0.73, volume: 12800000 },
  { symbol: '300750', name: '宁德时代', type: 'stock', price: 268.40, change: 5.60, changePct: 2.13, volume: 21800000 },
  { symbol: '002594', name: '比亚迪', type: 'stock', price: 285.30, change: -2.10, changePct: -0.73, volume: 19500000 },
  { symbol: '601012', name: '隆基绿能', type: 'stock', price: 18.74, change: 0.22, changePct: 1.19, volume: 51200000 },
  { symbol: '000333', name: '美的集团', type: 'stock', price: 75.90, change: 0.85, changePct: 1.13, volume: 23400000 },
  { symbol: '600900', name: '长江电力', type: 'stock', price: 28.45, change: -0.15, changePct: -0.52, volume: 28900000 },
  { symbol: '601899', name: '紫金矿业', type: 'stock', price: 17.62, change: 0.38, changePct: 2.20, volume: 67300000 },
  { symbol: 'GLD', name: 'SPDR Gold Trust', type: 'etf', price: 241.08, change: 0.94, changePct: 0.39, volume: 6800000 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf', price: 512.33, change: 1.78, changePct: 0.35, volume: 31200000 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf', price: 598.42, change: 0.66, changePct: 0.11, volume: 45600000 },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 96250.00, change: 1240.00, changePct: 1.31, volume: 38200000000 },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 3380.50, change: -52.30, changePct: -1.52, volume: 15400000000 },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'fx', price: 1.0485, change: -0.0021, changePct: -0.20, volume: 0 },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', type: 'fx', price: 154.32, change: 0.18, changePct: 0.12, volume: 0 },
  { symbol: 'XAUUSD', name: 'Gold Spot / US Dollar', type: 'commodity', price: 2642.10, change: 6.40, changePct: 0.24, volume: 0 },
  { symbol: 'CL', name: 'Crude Oil WTI', type: 'commodity', price: 69.85, change: -0.42, changePct: -0.60, volume: 0 },
];

/** 首次运行时写入种子；已有数据则跳过。 */
export function ensureSeed(): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM tickers').get() as { c: number };
  if (row.c > 0) return;

  const insTicker = db.prepare(
    'INSERT OR IGNORE INTO tickers (symbol, name, type) VALUES (?, ?, ?)',
  );
  const insQuote = db.prepare(
    'INSERT INTO quotes (symbol, price, change, change_pct, volume, fetched_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const s of SEED) {
      insTicker.run(s.symbol, s.name, s.type);
      insQuote.run(s.symbol, s.price, s.change, s.changePct, s.volume, now);
    }
  });
  tx();
}
