export type AdRevenueType = 'income' | 'expense';

export interface AdRevenuePlacement {
  channel_id: number;
  title: string;
  username: string | null;
  photo_url: string | null;
  post_link: string | null;
}

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
  channel_username?: string | null;
  is_pinned?: boolean;
  is_auto_delete?: boolean;
  is_repeating?: boolean;
  views_count?: number;
  forwards_count?: number;
  reactions_count?: number;
  comments_count?: number;
  clicks_count?: number;
  subscribers_in_24h?: number | null;
  subscribers_in_48h?: number | null;
  subscribers_out_24h?: number | null;
  subscribers_out_48h?: number | null;
  retention_rate?: number | null;
  placements?: AdRevenuePlacement[];
  publication_status?: string | null;
  created_at: string;
  updated_at: string;
}

export type AdRevenueSortKey =
  | 'date'
  | 'price'
  | 'type'
  | 'comments'
  | 'views'
  | 'clicks'
  | 'reactions'
  | 'subscribers_in'
  | 'subscribers_out'
  | 'retention'
  | 'placement'
  | 'subject';

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
  published_ads_count: number;
  scheduled_ads_count: number;
  currency: string;
  currencies: string[];
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
  channel_username?: string | null;
  post_link?: string | null;
  is_pinned?: boolean;
  is_auto_delete?: boolean;
  is_repeating?: boolean;
}

export type AdRevenueUpdatePayload = Partial<AdRevenueCreatePayload>;

export type CommunityKind = 'channel' | 'group' | 'bot';
export type CommunityFilter = 'all' | 'channels' | 'groups' | 'bots';

export interface CommunityStatsItem {
  id: number;
  kind: CommunityKind;
  title: string;
  username: string | null;
  photo_url: string | null;
  income: string;
  expense: string;
  published_ads_count: number;
  scheduled_ads_count: number;
}

export interface CommunityStatsResponse {
  items: CommunityStatsItem[];
}

export interface MonthlyAdStatItem {
  month: number;
  income: string;
  expense: string;
}

export interface MonthlyAdStatsResponse {
  year: number;
  months: MonthlyAdStatItem[];
}

export interface MonthlyAdStatsFilters {
  year?: number;
  currency?: string;
  channel_id?: number;
}

export interface CommunityStatsFilters {
  date_from?: string;
  date_to?: string;
  currency?: string;
  kind?: CommunityFilter;
}

export interface AdRevenueListFilters {
  type?: AdRevenueType;
  channel_id?: number;
  bot_id?: number;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
  sort_by?: AdRevenueSortKey;
  sort_dir?: 'asc' | 'desc';
  status?: 'scheduled' | 'published';
  currency?: string;
}
