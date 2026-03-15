// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://suzair.duckdns.org/api';

// Helper to get full API URL
export const getApiUrl = (path: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Helper to get upload URL
export const getUploadUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'https://suzair.duckdns.org';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
};
