/**
 * API Configuration
 * 
 * This file centralizes API URL configuration and provides helper functions
 * for working with API endpoints.
 */

// API base URL - use backend URL as default
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
                           'https://autosparesbackend-production.up.railway.app/api/v1';

// Database URL for direct connections if needed
export const DATABASE_URL = process.env.DATABASE_URL || 
                           'https://autosparesbackend-production.up.railway.app';

/**
 * Builds a complete API URL by joining the base URL with the provided path
 * 
 * @param path - The API endpoint path
 * @returns The complete API URL
 */
export function buildApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * Creates standard headers for API requests including authorization if token is available
 * 
 * @param additionalHeaders - Optional additional headers to include
 * @returns Headers object with content type and authorization if available
 */
export function getApiHeaders(additionalHeaders: Record<string, string> = {}): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...additionalHeaders
  };
}

/**
 * Makes a fetch request to the API with proper error handling
 * 
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @returns Promise with the parsed response data
 */
export async function fetchApi<T = any>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  const headers = getApiHeaders(options.headers as Record<string, string>);
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  
  return response.json();
}
