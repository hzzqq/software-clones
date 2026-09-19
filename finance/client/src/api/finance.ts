import { apiClient } from './client';

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
  count?: number;
}

/** Finance terminal API client. */
export const financeApi = {
  listTickers: () => apiClient.get<Ticker[]>('/tickers'),
  createTicker: (symbol: string, name?: string, type?: string) =>
    apiClient.post<Ticker>('/tickers', { symbol, name, type }),
  listQuotes: () => apiClient.get<Quote[]>('/quotes'),
  getQuote: (symbol: string) => apiClient.get<Quote>(`/quotes/${symbol}`),
  listWatchlists: () => apiClient.get<Watchlist[]>('/watchlists'),
  createWatchlist: (name: string) => apiClient.post<Watchlist>('/watchlists', { name }),
  deleteWatchlist: (id: number) => apiClient.delete(`/watchlists/${id}`),
  addToWatchlist: (id: number, tickerId: number) =>
    apiClient.post(`/watchlists/${id}/items`, { tickerId }),
  removeFromWatchlist: (id: number, tickerId: number) =>
    apiClient.delete(`/watchlists/${id}/items/${tickerId}`),
  refresh: () => apiClient.post<{ refreshed: number; source: string }>('/refresh', {}),
};
