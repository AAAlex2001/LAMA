// Бизнес-логика для работы с каналами

import type { Channel } from './types';
import { fetchChannels, syncChannel, deleteChannel, parseChannelInput } from './api';

export interface ChannelResult {
  success: boolean;
  message?: string;
  channel?: Channel;
  channels?: Channel[];
}

/**
 * Загрузить список каналов
 */
export async function loadChannels(
  page: number = 1,
  pageSize: number = 50
): Promise<ChannelResult & { total?: number }> {
  try {
    const response = await fetchChannels(page, pageSize);
    
    return {
      success: true,
      channels: response.items,
      total: response.total,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка загрузки каналов',
    };
  }
}

/**
 * Добавить новый канал по ссылке/username/ID
 */
export async function addChannel(input: string): Promise<ChannelResult> {
  try {
    if (!input.trim()) {
      return {
        success: false,
        message: 'Введите ссылку, username или ID канала',
      };
    }
    
    const syncData = parseChannelInput(input);
    const response = await syncChannel(syncData);
    
    if (!response.success) {
      return {
        success: false,
        message: response.message || 'Не удалось подключить канал',
      };
    }
    
    return {
      success: true,
      channel: response.channel,
      message: 'Канал успешно подключен',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка подключения канала',
    };
  }
}

/**
 * Удалить канал
 */
export async function removeChannel(channelId: number): Promise<ChannelResult> {
  try {
    await deleteChannel(channelId);
    
    return {
      success: true,
      message: 'Канал удален',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Ошибка удаления канала',
    };
  }
}
