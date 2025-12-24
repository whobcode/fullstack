const BASE_URL = '/api';

export const apiClient = {
  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as T;
    if (!response.ok) {
      const message = (data as any)?.error || 'An error occurred';
      throw new Error(message);
    }
    return data;
  },

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`);
    const data = await response.json() as T;
    if (!response.ok) {
      const message = (data as any)?.error || 'An error occurred';
      throw new Error(message);
    }
    return data;
  },

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json() as T;
    if (!response.ok) {
      const message = (data as any)?.error || 'An error occurred';
      throw new Error(message);
    }
    return data;
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
    });
    const data = await response.json() as T;
    if (!response.ok) {
      const message = (data as any)?.error || 'An error occurred';
      throw new Error(message);
    }
    return data;
  },
};
