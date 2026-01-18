// Типы для регистрации

export interface TelegramWidgetUser {
  id: number;
  hash: string;
  auth_date: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  [key: string]: unknown;
}

export interface TelegramAccount {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface User {
  id: number;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  email_verified?: boolean;
  telegram_account?: TelegramAccount;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  user?: User;
  registration_completed?: boolean;
}

export interface AddEmailRequest {
  email: string;
  password: string;
  agree_personal_data: boolean;
  agree_terms: boolean;
}

export interface RegisterResult {
  success: boolean;
  message?: string;
  requiresEmailStep?: boolean;
  completed?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User | null;
}

export type RegisterStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RegisterState {
  step: 1 | 2;
  loading: boolean;
  error: string | null;
  status: RegisterStatus;
  user: User | null;
  accessToken: string | null;

  // Step 2
  email: string;
  password: string;
  agreePersonalData: boolean;
  agreeTerms: boolean;
}

export type RegisterAction =
  | { type: 'SET_STEP'; payload: 1 | 2 }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATUS'; payload: RegisterStatus }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ACCESS_TOKEN'; payload: string | null }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_PASSWORD'; payload: string }
  | { type: 'SET_AGREE_PERSONAL_DATA'; payload: boolean }
  | { type: 'SET_AGREE_TERMS'; payload: boolean }
  | { type: 'RESET' };
