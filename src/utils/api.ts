export function getApiHeaders(extra?: Record<string, string>): HeadersInit {
  const username = sessionStorage.getItem('yanhee_user');
  return {
    'Content-Type': 'application/json',
    ...(username ? { 'X-Current-User': username } : {}),
    ...extra
  };
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getApiHeaders(),
    ...(options.headers as Record<string, string> | undefined)
  };
  return fetch(url, { ...options, headers });
}
