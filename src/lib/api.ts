export const API = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`/api${path}`, { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`/api${path}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async put<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`/api${path}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async del<T>(path: string): Promise<T> {
    const res = await fetch(`/api${path}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
