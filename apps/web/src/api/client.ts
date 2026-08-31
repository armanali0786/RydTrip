export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.message || `API Error: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or server unreachable
    console.warn(`[API Client] Endpoint ${endpoint} unreachable via backend server. Using local dispatch fallback.`);
    throw new ApiError(503, 'Service Temporarily Unavailable');
  }
}
