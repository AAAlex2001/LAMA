
import type { TelegramWidgetUser, EmailLoginRequest, BotLoginRequest, LoginResult } from './types';
import { loginWithTelegram, loginWithBot, loginWithEmail, logout as apiLogout } from './api';

const TOKEN_KEYS = {
  access: 'lamaplanner_access_token',
  refresh: 'lamaplanner_refresh_token',
} as const;

export function saveTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(TOKEN_KEYS.access, accessToken);
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.access);
}

export async function handleTelegramLogin(
  user: TelegramWidgetUser
): Promise<LoginResult> {
  try {
    const response = await loginWithTelegram(user);

    if (response.access_token) {
      saveTokens(response.access_token, response.refresh_token);
    }

    if (response.registration_completed === false) {
      return {
        success: true,
        requiresRegistration: true,
      };
    }

    return {
      success: true,
      message: 'Успешный вход через Telegram',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка входа через Telegram',
    };
  }
}

export async function handleBotLogin(
  data: BotLoginRequest
): Promise<LoginResult> {
  try {
    const response = await loginWithBot(data);

    if (response.access_token) {
      saveTokens(response.access_token, response.refresh_token);
    }

    if (response.registration_completed === false) {
      return {
        success: true,
        requiresRegistration: true,
      };
    }

    return {
      success: true,
      message: 'Успешный вход через бота',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка входа через бота',
    };
  }
}

export async function handleEmailLogin(
  credentials: EmailLoginRequest
): Promise<LoginResult> {
  try {
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        message: 'Email и пароль обязательны',
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      return {
        success: false,
        message: 'Некорректный email',
      };
    }

    const response = await loginWithEmail(credentials);

    if (response.access_token) {
      saveTokens(response.access_token, response.refresh_token);
    }

    if (response.registration_completed === false) {
      return {
        success: true,
        requiresRegistration: true,
      };
    }

    return {
      success: true,
      message: 'Успешный вход',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка входа',
    };
  }
}

export async function handleLogout(): Promise<void> {
  const token = getAccessToken();

  if (token) {
    try {
      await apiLogout(token);
    } catch {
    }
  }

  clearTokens();
}
