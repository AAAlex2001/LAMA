// API клиент для работы с постами

import type {
  CreatePostRequest,
  CreatePostResponse,
  PublishPostResponse,
} from './types';

export interface CreateSeriesRequest {
  name: string;
  description?: string | null;
  reply_to_previous?: boolean;
}

export interface CreateSeriesResponse {
  id: number;
  name: string;
  description?: string | null;
  reply_to_previous: boolean;
  created_at: string;
}

// Базовый URL API (можно вынести в .env)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthToken(): string | null {
  return typeof window !== 'undefined' 
    ? localStorage.getItem('lamaplanner_access_token') 
    : null;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
    
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // FastAPI возвращает ошибки в поле detail
      const errorMessage = errorData.detail || errorData.message || 'Ошибка при выполнении запроса';
      throw new ApiError(
        errorMessage,
        response.status,
        errorData.errors
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
 * Создать новый пост
 */
export async function createPost(
  data: CreatePostRequest
): Promise<CreatePostResponse> {
  return fetchApi<CreatePostResponse>('/publications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Опубликовать пост в каналы
 */
export async function publishPost(
  postId: number
): Promise<PublishPostResponse> {
  return fetchApi<PublishPostResponse>(`/publications/${postId}/publish`, {
    method: 'POST',
  });
}

/**
 * Создать серию публикаций
 */
export async function createSeries(data: CreateSeriesRequest): Promise<CreateSeriesResponse> {
  return fetchApi<CreateSeriesResponse>('/publications/series', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Создать и сразу опубликовать пост
 */
export async function createAndPublishPost(
  data: CreatePostRequest
): Promise<CreatePostResponse> {
  try {
    // Сначала создаём пост
    const createResponse: any = await createPost(data);
    
    // Бэкенд возвращает объект с id, а не success/postId
    const postId = createResponse.id || createResponse.postId;
    
    if (!postId) {
      return {
        success: false,
        message: 'Не удалось создать пост - отсутствует ID',
        errors: ['No post ID in response'],
      };
    }

    const publishedPost = await publishPost(postId);

    if (!publishedPost || publishedPost.status === 'failed') {
      return {
        success: false,
        postId: postId,
        id: postId,
        message: `Не удалось опубликовать`,
        errors: ['Публикация не удалась'],
      };
    }

    return {
      success: true,
      postId: postId,
      id: postId,
      message: `OK — публикация поставлена в очередь`,
    };
  } catch (error) {
    // Извлекаем детальное сообщение об ошибке
    let errorMessage = 'Ошибка при создании/публикации поста';
    let errorList: string[] = [];
    
    if (error instanceof ApiError) {
      errorMessage = error.message;
      if (error.errors) {
        errorList = error.errors;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
      errors: errorList.length > 0 ? errorList : undefined,
    };
  }
}

/**
 * Сохранить пост в черновики
 */
export async function saveDraft(
  data: CreatePostRequest
): Promise<CreatePostResponse> {
  return fetchApi<CreatePostResponse>('/publications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface UploadedFile {
  url: string;
  filename: string;
  type: 'image' | 'video' | 'document';
  original_name: string;
  file_id?: string;  // Telegram file_id после прогрева медиа
  thumbnailUrl?: string | null;  // URL сжатой превьюшки
}

export interface UploadMediaResponse {
  files: UploadedFile[];
  file_ids?: string[];  // Telegram file_ids после прогрева медиа
  thumbnail_urls?: (string | null)[];  // Сжатые превьюшки с бэка
}

/**
 * Загрузить один медиа файл на сервер
 */
async function uploadSingleFile(file: File): Promise<UploadedFile> {
  const url = `${API_BASE_URL}/upload-media`;
  
  const formData = new FormData();
  formData.append('files', file);

  const token = getAuthToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `Ошибка при загрузке ${file.name}`,
      response.status
    );
  }

  const data = await response.json();
  // API возвращает {success: true, files: [...], file_ids: [...], thumbnail_urls: [...]}
  const result = data.files[0];
  if (data.file_ids && data.file_ids.length > 0) {
    result.file_id = data.file_ids[0];
  }
  if (data.thumbnail_urls && data.thumbnail_urls.length > 0) {
    result.thumbnailUrl = data.thumbnail_urls[0];
  }
  return result;
}

/**
 * Загрузить медиа файлы на сервер (параллельно, каждый отдельным запросом)
 */
export async function uploadMediaFiles(files: File[]): Promise<UploadMediaResponse> {
  // Проверяем общий размер файлов
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (totalSize > maxSize) {
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    throw new ApiError(
      `Общий размер файлов превышает лимит (${sizeMB}MB из 50MB). Удалите или сожмите некоторые файлы.`
    );
  }
  
  // Загружаем все файлы параллельно
  const uploadPromises = files.map(file => uploadSingleFile(file));
  
  const results = await Promise.allSettled(uploadPromises);
  
  const uploadedFiles: UploadedFile[] = [];
  const errors: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      uploadedFiles.push(result.value);
    } else {
      errors.push(`${files[index].name}: ${result.reason?.message || 'Ошибка загрузки'}`);
      console.error(`Failed to upload ${files[index].name}:`, result.reason);
    }
  });
  
  if (uploadedFiles.length === 0 && errors.length > 0) {
    throw new ApiError(`Не удалось загрузить файлы: ${errors.join(', ')}`);
  }
  
  // Собираем file_ids и thumbnail_urls из загруженных файлов
  const fileIds = uploadedFiles.map(f => f.file_id).filter(id => id !== undefined) as string[];
  const thumbnailUrls = uploadedFiles.map(f => f.thumbnailUrl || null);
  
  return { 
    files: uploadedFiles,
    file_ids: fileIds.length > 0 ? fileIds : undefined,
    thumbnail_urls: thumbnailUrls
  };
}
