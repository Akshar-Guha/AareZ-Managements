// API base URL - use environment-specific URLs
const getApiBaseUrl = () => {
  console.group('API Base URL Determination');
  
  // Use environment variable for base URL with robust detection
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const hasWindow = typeof window !== 'undefined';
  const windowHostname = hasWindow ? window.location.hostname : '';
  const windowOrigin = hasWindow ? window.location.origin : '';

  // Determine if we are running on localhost
  const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(windowHostname) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(windowHostname);

  // If not on localhost (i.e., deployed), always prefer same-origin to avoid CORS
  // Only use envBaseUrl if it's explicitly provided and not pointing to localhost
  let baseUrl: string;
  if (hasWindow && !isLocalhost) {
    if (envBaseUrl && !/localhost/.test(envBaseUrl)) {
      baseUrl = envBaseUrl;
    } else {
      baseUrl = windowOrigin; // same-origin on Vercel/custom domain
    }
  } else {
    // Local development: allow override via env or default to local API
    baseUrl = envBaseUrl || 'http://localhost:3100';
  }

  console.log('Environment Base URL:', envBaseUrl);
  console.log('Window Hostname:', windowHostname);
  console.log('Window Origin:', windowOrigin);
  console.log('Is Localhost:', isLocalhost);
  console.log('Determined base URL:', baseUrl);
  console.groupEnd();
  return baseUrl;
};

export const API = {
  async get<T>(path: string): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      console.group(`API GET Request: ${path}`);
      console.log(`Fetching GET ${baseUrl}/api${path}`);
      
      const res = await fetch(`${baseUrl}/api${path}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log(`GET /api${path} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`GET /api${path} error:`, errorText);
        console.groupEnd();
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error(`GET /api${path} network error:`, error);
      console.groupEnd();
      throw error;
    }
  },
  
  async post<T>(path: string, body?: any): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      console.group(`API POST Request: ${path}`);
      console.log(`Posting to ${baseUrl}/api${path}`, body);
      const res = await fetch(`${baseUrl}/api${path}`, {
        method: 'POST', 
        credentials: 'include', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }, 
        body: body ? JSON.stringify(body) : undefined 
      });
      
      console.log(`POST /api${path} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`POST /api${path} error:`, errorText);
        console.groupEnd();
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error(`POST /api${path} network error:`, error);
      console.groupEnd();
      throw error;
    }
  },
  
  async put<T>(path: string, body?: any): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      console.log(`Putting to ${baseUrl}/api${path}`, body);
      const res = await fetch(`${baseUrl}/api${path}`, {
        method: 'PUT', 
        credentials: 'include', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }, 
        body: JSON.stringify(body) 
      });
      
      console.log(`PUT /api${path} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`PUT /api${path} error:`, errorText);
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error(`PUT /api${path} network error:`, error);
      throw error;
    }
  },
  
  async del<T>(path: string): Promise<T> {
    try {
      const baseUrl = getApiBaseUrl();
      console.log(`Deleting ${baseUrl}/api${path}`);
      const res = await fetch(`${baseUrl}/api${path}`, {
        method: 'DELETE', 
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log(`DELETE /api${path} response status:`, res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`DELETE /api${path} error:`, errorText);
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error(`DELETE /api${path} network error:`, error);
      throw error;
    }
  },
};

export default API;
