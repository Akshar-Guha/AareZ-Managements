// API base URL - use environment-specific URLs
const getApiBaseUrl = () => {
  console.group('API Base URL Determination');
  
  const hasWindow = typeof window !== 'undefined';
  const windowHostname = hasWindow ? window.location.hostname : '';
  const windowOrigin = hasWindow ? window.location.origin : '';

  // Determine if we are running on localhost
  const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(windowHostname) || 
                     /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(windowHostname);

  // Handle different deployment scenarios
  let baseUrl: string;
  if (hasWindow) {
    if (isLocalhost) {
      // Local development - backend runs on different port
      baseUrl = 'http://localhost:5174';
    } else {
      // Production - frontend and backend are separate deployments
      baseUrl = 'https://aarez-mgnmt-git-backend-only-umbrag.vercel.app';
    }
  } else {
    // Server-side rendering or other contexts fallback
    baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://aarez-mgnmt-git-backend-only-umbrag.vercel.app';
  }
  
  console.log('Determined base URL:', baseUrl);
  console.groupEnd();
  return baseUrl;
};

export const API = {
  async get<T>(path: string): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      console.group(`API GET Request: ${path}`);
      
      // Ensure path starts with /api/ if it doesn't already
      const fullPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
      
      console.log(`Fetching GET ${baseUrl}${fullPath}`);

      const res = await fetch(`${baseUrl}${fullPath}`, {
        credentials: 'include', // Explicitly include credentials for cross-site requests
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`GET ${fullPath} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`GET ${fullPath} error:`, errorText);
        console.groupEnd();
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error(`GET ${path} network error:`, error);
      console.groupEnd();
      throw error;
    }
  },
  
  async post<T>(path: string, body?: any): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      console.group(`API POST Request: ${path}`);
      
      // Ensure path starts with /api/ if it doesn't already
      const fullPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
      
      console.log(`Posting to ${baseUrl}${fullPath}`, body);
      
      // Log full request details
      console.log('Full Request Details:', {
        url: `${baseUrl}${fullPath}`,
        method: 'POST',
        body: body ? JSON.stringify(body) : 'No body',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      const res = await fetch(`${baseUrl}${fullPath}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      console.log(`POST ${fullPath} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`POST ${fullPath} error:`, {
          status: res.status,
          statusText: res.statusText,
          errorBody: errorText
        });
        console.groupEnd();
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error(`POST ${path} network error:`, {
        errorName: error instanceof Error ? error.name : 'Unknown Error',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      });
      console.groupEnd();
      throw error;
    }
  },
  
  async put<T>(path: string, body?: any): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      
      // Ensure path starts with /api/ if it doesn't already
      const fullPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
      
      console.log(`Putting to ${baseUrl}${fullPath}`, body);
      
      const res = await fetch(`${baseUrl}${fullPath}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      console.log(`PUT ${fullPath} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`PUT ${fullPath} error:`, errorText);
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error(`PUT ${path} network error:`, error);
      throw error;
    }
  },
  
  async del<T>(path: string): Promise<T | undefined> {
    try {
      const baseUrl = getApiBaseUrl();
      
      // Ensure path starts with /api/ if it doesn't already
      const fullPath = path.startsWith('/api/') ? path : `/api/${path.replace(/^\//, '')}`;
      
      console.log(`Deleting ${baseUrl}${fullPath}`);
      
      const res = await fetch(`${baseUrl}${fullPath}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`DELETE ${fullPath} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`DELETE ${fullPath} error:`, errorText);
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error(`DELETE ${path} network error:`, error);
      throw error;
    }
  },
};

export default API;