// API клиент для работы с каналами

import type { 
  Channel, 
  ChannelListResponse, 
  SyncChannelRequest, 
  SyncChannelResponse 
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const ENDPOINTS = {
  channels: `${API_BASE_URL}/channels`,
  sync: `${API_BASE_URL}/channels/sync`,
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
    return detail.map((d: Record<string, unknown>) => d?.msg || String(d)).join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return 'Ошибка сервера. Попробуйте позже';
}

// TODO: убрать хардкод токена после настройки авторизации
const HARDCODED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2ODI1MzA4MywiaWF0IjoxNzY4MTY2NjgzLCJqdGkiOiJ4bUVlb3dZVzkxZURyMXdCZzhsamFBIn0.Xa6m9r972G_usfLD5S0CxAv1h332aRHhS5htLcgQKyA';

function getAuthHeaders(): HeadersInit {
  const token = HARDCODED_TOKEN || (
    typeof window !== 'undefined' 
      ? localStorage.getItem('lamaplanner_access_token') 
      : null
  );
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
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
 * Получить список каналов пользователя
 */
export async function fetchChannels(
  page: number = 1,
  pageSize: number = 50
): Promise<ChannelListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  
  return fetchApi<ChannelListResponse>(`${ENDPOINTS.channels}?${params}`);
}

/**
 * Синхронизировать канал через Telegram API
 * Принимает username, telegram_id или invite_link
 */
export async function syncChannel(
  data: SyncChannelRequest
): Promise<SyncChannelResponse> {
  return fetchApi<SyncChannelResponse>(ENDPOINTS.sync, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Получить информацию о канале
 */
export async function getChannel(channelId: number): Promise<Channel> {
  return fetchApi<Channel>(`${ENDPOINTS.channels}/${channelId}`);
}

/**
 * Удалить канал
 */
export async function deleteChannel(channelId: number): Promise<void> {
  await fetchApi<void>(`${ENDPOINTS.channels}/${channelId}`, {
    method: 'DELETE',
  });
}

// TODO: убрать хардкод токена бота после настройки
const MASTER_BOT_TOKEN = '8308599165:AAGZ3NgOQE34lZ8EwTPB_8HPH_fsqpfffUw';

/**
 * Парсинг ввода пользователя (username, ссылка или ID)
 */
export function parseChannelInput(input: string): SyncChannelRequest {
  const trimmed = input.trim();
  
  // Базовый объект с токеном бота
  const base = { token: MASTER_BOT_TOKEN };
  
  // Числовой ID
  if (/^-?\d+$/.test(trimmed)) {
    return { ...base, telegram_id: parseInt(trimmed, 10) };
  }
  
  // Ссылка t.me
  if (trimmed.includes('t.me/')) {
    return { ...base, invite_link: trimmed };
  }
  
  // Username (с или без @)
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return { ...base, username };
}
