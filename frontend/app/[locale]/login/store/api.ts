// API клиент для авторизации

import type {
  TelegramWidgetUser,
  AuthResponse,
  EmailLoginRequest,
  BotLoginRequest,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const ENDPOINTS = {
  telegramAuth: `${API_BASE_URL}/auth/telegram`,
  botLogin: `${API_BASE_URL}/auth/bot-login`,
  emailLogin: `${API_BASE_URL}/auth/login`,
  refresh: `${API_BASE_URL}/auth/refresh`,
  me: `${API_BASE_URL}/auth/me`,
  logout: `${API_BASE_URL}/auth/logout`,
} as const;

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function parseErrorMessage(detail: unknown): string {
  if (Array.isArray(detail)) {
    return detail.map((d: Record<string, unknown>) => d?.msg || String(d)).join(", ");
  }
  if (typeof detail === "string") {
    return detail;
  }
  return "Ошибка сервера. Попробуйте позже";
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(endpoint, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        parseErrorMessage(errorData.detail),
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Ошибка сети или сервера недоступен');
  }
}

/**
 * Авторизация через Telegram Widget
 */
export async function loginWithTelegram(
  user: TelegramWidgetUser
): Promise<AuthResponse> {
  return fetchApi<AuthResponse>(ENDPOINTS.telegramAuth, {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

/**
 * Авторизация через бота по telegram_id
 */
export async function loginWithBot(
  data: BotLoginRequest
): Promise<AuthResponse> {
  return fetchApi<AuthResponse>(ENDPOINTS.botLogin, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Авторизация по email/password
 */
export async function loginWithEmail(
  credentials: EmailLoginRequest
): Promise<AuthResponse> {
  return fetchApi<AuthResponse>(ENDPOINTS.emailLogin, {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * Выход из системы
 */
export async function logout(token: string): Promise<void> {
  await fetch(ENDPOINTS.logout, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser(token: string): Promise<AuthResponse['user']> {
  return fetchApi<AuthResponse['user']>(ENDPOINTS.me, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
