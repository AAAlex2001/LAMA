const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export function getAuthToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('lamaplanner_access_token')
    : null;
}

interface ApiRequestOptions extends RequestInit {
  skipApiPrefix?: boolean;
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { skipApiPrefix, ...fetchOptions } = options;
  const url = skipApiPrefix ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  const response = await fetch(url, { ...fetchOptions, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Ошибка запроса');
  }

  if (response.status === 204) return undefined as T;

  return response.json();
}

export async function uploadMediaFile(file: File) {
  const url = `${API_BASE_URL}/upload-media`;
  const token = getAuthToken();

  const formData = new FormData();
  formData.append('files', file);

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, { method: 'POST', headers, body: formData });

  if (!response.ok) throw new Error(`Ошибка загрузки ${file.name}`);

  const data = await response.json();
  const result = data.files[0];
  if (data.file_ids?.length > 0) result.file_id = data.file_ids[0];
  if (data.thumbnail_urls?.length > 0) result.thumbnailUrl = data.thumbnail_urls[0];
  return result;
}

export { API_BASE_URL };
