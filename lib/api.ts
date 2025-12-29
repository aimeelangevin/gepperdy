// API utility functions for client-side requests

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP error! status: ${response.status}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

// User API functions
export const userApi = {
  getAll: () => apiFetch<User[]>('/api/users'),
  
  getById: (id: number) => apiFetch<User>(`/api/users/${id}`),
  
  create: (user: Omit<User, 'id'>) =>
    apiFetch<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),
  
  update: (id: number, user: Partial<Omit<User, 'id'>>) =>
    apiFetch<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    }),
  
  delete: (id: number) =>
    apiFetch<User>(`/api/users/${id}`, {
      method: 'DELETE',
    }),
};

// Hello API example
export const helloApi = {
  get: () => apiFetch<{ message: string; timestamp: string }>('/api/hello'),
  
  post: (data: any) =>
    apiFetch<{ message: string; receivedData: any; timestamp: string }>(
      '/api/hello',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),
};

