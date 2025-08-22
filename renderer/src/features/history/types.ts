// History types - placeholder for future functionality
export interface HistoryFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  clientId?: number;
}

export interface HistorySearchParams {
  query?: string;
  filters?: HistoryFilter;
  page?: number;
  limit?: number;
}
