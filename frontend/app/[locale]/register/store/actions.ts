// Бизнес-логика регистрации

import type { AddEmailRequest, RegisterResult, TelegramWidgetUser } from './types';
import { addEmail, registerWithTelegram } from './api';

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

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEYS.access);
}

export async function handleTelegramRegister(user: TelegramWidgetUser): Promise<RegisterResult> {
  try {
    const response = await registerWithTelegram(user);

    if (response.access_token) {
      saveTokens(response.access_token, response.refresh_token);
    }

    if (response.registration_completed === false) {
      return {
        success: true,
        requiresEmailStep: true,
        completed: false,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user ?? null,
      };
    }

    return {
      success: true,
      completed: true,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: response.user ?? null,
      message: 'Регистрация через Telegram выполнена',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка регистрации через Telegram',
    };
  }
}

export async function handleAddEmail(token: string, payload: AddEmailRequest): Promise<RegisterResult> {
  try {
    const user = await addEmail(token, payload);

    return {
      success: true,
      completed: true,
      user,
      message: 'Email добавлен',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка добавления email',
    };
  }
}
