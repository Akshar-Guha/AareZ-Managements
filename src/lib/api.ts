export const API = {
  async get<T>(path: string): Promise<T> {
    try {
      console.log(`Fetching GET /api${path}`);
      const res = await fetch(`/api${path}`, { 
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
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error(`GET /api${path} network error:`, error);
      throw error;
    }
  },
  
  async post<T>(path: string, body?: any): Promise<T> {
    try {
      console.log(`Posting to /api${path}`, body);
      const res = await fetch(`/api${path}`, { 
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
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
      }
      
      return res.json();
    } catch (error) {
      console.error(`POST /api${path} network error:`, error);
      throw error;
    }
  },
  
  async put<T>(path: string, body?: any): Promise<T> {
    try {
      console.log(`Putting to /api${path}`, body);
      const res = await fetch(`/api${path}`, { 
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
      console.log(`Deleting /api${path}`);
      const res = await fetch(`/api${path}`, { 
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
