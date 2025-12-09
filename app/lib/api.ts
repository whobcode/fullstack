/**
 * @module api
 * This module provides a simple API client for making HTTP requests to the backend.
 */
const BASE_URL = '/api';

export const apiClient = {
  /**
   * Makes a POST request to the specified path.
   * @param {string} path - The path to make the request to.
   * @param {unknown} body - The body of the request.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
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

  /**
   * Makes a GET request to the specified path.
   * @param {string} path - The path to make the request to.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`);
    const data = await response.json() as T;
    if (!response.ok) {
      const message = (data as any)?.error || 'An error occurred';
      throw new Error(message);
    }
    return data;
  },

  /**
   * Makes a PUT request to the specified path.
   * @param {string} path - The path to make the request to.
   * @param {unknown} body - The body of the request.
   * @returns {Promise<T>} A promise that resolves to the response data.
   */
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

  // Add put, delete methods as needed
};
