export type AdRevenueType = 'income' | 'expense';

export interface AdRevenue {
  id: number;
  owner_id: number;
  type: AdRevenueType;
  buyer: string | null;
  amount: string;
  currency: string;
  revenue_date: string;
  note: string | null;
  publication_id: number | null;
  channel_id: number | null;
  bot_id: number | null;
  post_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdRevenueListResponse {
  items: AdRevenue[];
  total: number;
}

export interface AdRevenueStats {
  income_total: string;
  expense_total: string;
  profit: string;
  income_count: number;
  expense_count: number;
}

export interface AdRevenueCreatePayload {
  type: AdRevenueType;
  buyer?: string | null;
  amount: number | string;
  currency?: string;
  revenue_date: string;
  note?: string | null;
  publication_id?: number | null;
  channel_id?: number | null;
  bot_id?: number | null;
}

export type AdRevenueUpdatePayload = Partial<AdRevenueCreatePayload>;

export interface AdRevenueListFilters {
  type?: AdRevenueType;
  channel_id?: number;
  bot_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
