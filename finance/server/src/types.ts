export interface Ticker {
  id: number;
  symbol: string;
  name: string;
  type: string;
}

export interface Quote {
  id: number;
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  fetchedAt: string;
}

export interface Watchlist {
  id: number;
  name: string;
  createdAt: string;
}

export interface TickerInput {
  symbol: string;
  name?: string;
  type?: string;
}

export interface WatchlistInput {
  name: string;
}
