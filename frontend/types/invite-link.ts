export interface InviteLink {
  id: number;
  channel_id: number;
  invite_link: string;
  name: string;
  creator_id: number;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  expire_date: string | null;
  member_limit: number;
  pending_join_request_count: number;
  member_count: number;
  subscription_period: number;
  subscription_price: number;
  created_at: string;
  updated_at: string;
}

export interface InviteLinksResponse {
  items: InviteLink[];
  total: number;
}
