/**
 * API Configuration
 * Central place to define API endpoints and base URLs
 *
 * IMPORTANT: Update the baseUrl to match your backend API URL
 *
 * For development: 'https://localhost:5001' or 'http://localhost:5000'
 * For production: Update to your production API URL
 */

import { environment } from '../../environments/environment';

export const API_CONFIG = {
  // Base URL for API calls - UPDATE THIS TO MATCH YOUR BACKEND
  baseUrl: environment.apiUrl, // Update this to match your backend URL

  // API Endpoints
  endpoints: {
    // Authentication endpoints
    auth: {
      login: '/api/Account/login',
      register: '/api/Account/register',
      changePassword: '/api/Account/change-password',
      refreshToken: '/api/Account/refresh-token',
      profile: '/api/Account/profile',
      updateProfile: '/api/Account/update-profile',
    },

    // Add more endpoint groups as needed
    cars: {
      list: '/api/Cars',
      get: '/api/Cars/{id}',
      create: '/api/Cars',
      update: '/api/Cars/{id}',
      delete: '/api/Cars/{id}',
    },
    bookings: {
      list: '/api/Bookings',
      get: '/api/Bookings/{id}',
      create: '/api/Bookings',
      update: '/api/Bookings/{id}',
      cancel: '/api/Bookings/{id}/cancel',
    },
  },
} as const;

/**
 * Get full API URL by combining base URL with endpoint
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.baseUrl}${cleanEndpoint}`;
}

/**
 * Helper function to get auth endpoint URLs
 */
export const AUTH_ENDPOINTS = {
  login: getApiUrl(API_CONFIG.endpoints.auth.login),
  register: getApiUrl(API_CONFIG.endpoints.auth.register),
  changePassword: getApiUrl(API_CONFIG.endpoints.auth.changePassword),
  refreshToken: getApiUrl(API_CONFIG.endpoints.auth.refreshToken),
  profile: getApiUrl(API_CONFIG.endpoints.auth.profile),
  updateProfile: getApiUrl(API_CONFIG.endpoints.auth.updateProfile),
} as const;

export const CAR_ENDPOINTS = {
  list: getApiUrl(API_CONFIG.endpoints.cars.list),
  get: (id: string) => getApiUrl(API_CONFIG.endpoints.cars.get.replace('{id}', id)),
  create: getApiUrl(API_CONFIG.endpoints.cars.create),
  update: (id: string) => getApiUrl(API_CONFIG.endpoints.cars.update.replace('{id}', id)),
  delete: (id: string) => getApiUrl(API_CONFIG.endpoints.cars.delete.replace('{id}', id)),
} as const;

export const BOOKING_ENDPOINTS = {
  list: getApiUrl(API_CONFIG.endpoints.bookings.list),
  get: (id: string) => getApiUrl(API_CONFIG.endpoints.bookings.get.replace('{id}', id)),
  create: getApiUrl(API_CONFIG.endpoints.bookings.create),
  update: (id: string) => getApiUrl(API_CONFIG.endpoints.bookings.update.replace('{id}', id)),
  cancel: (id: string) => getApiUrl(API_CONFIG.endpoints.bookings.cancel.replace('{id}', id)),
} as const;
