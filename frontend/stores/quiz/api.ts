import type { PollData } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('lamaplanner_access_token') 
    : null;
  
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
  };

  const response = await fetch(endpoint, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const quizApi = {
  async validatePoll(pollData: PollData): Promise<{ valid: boolean; errors?: string[] }> {
    // Валидация на клиенте
    const errors: string[] = [];

    if (!pollData.question || pollData.question.trim().length === 0) {
      errors.push('Вопрос не может быть пустым');
    }

    if (pollData.question.length > 300) {
      errors.push('Вопрос не может быть длиннее 300 символов');
    }

    if (pollData.options.length < 2) {
      errors.push('Необходимо минимум 2 варианта ответа');
    }

    if (pollData.options.length > 10) {
      errors.push('Максимум 10 вариантов ответа');
    }

    if (pollData.options.some(opt => !opt || opt.trim().length === 0)) {
      errors.push('Все варианты ответа должны быть заполнены');
    }

    if (pollData.options.some(opt => opt.length > 100)) {
      errors.push('Вариант ответа не может быть длиннее 100 символов');
    }

    if (pollData.is_quiz) {
      if (pollData.correct_option_id === undefined || pollData.correct_option_id === null) {
        errors.push('Для викторины необходимо указать правильный ответ');
      } else if (pollData.correct_option_id < 0 || pollData.correct_option_id >= pollData.options.length) {
        errors.push('Некорректный индекс правильного ответа');
      }

      if (pollData.explanation && pollData.explanation.length > 200) {
        errors.push('Объяснение не может быть длиннее 200 символов');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
