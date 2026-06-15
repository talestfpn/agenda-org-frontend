const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function getToken() {
  return localStorage.getItem('agendaorg:token');
}

export function setToken(token: string) {
  localStorage.setItem('agendaorg:token', token);
}

export function clearToken() {
  localStorage.removeItem('agendaorg:token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isForm = options.body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new ApiError('Nao foi possivel conectar ao backend. Confira se a API esta rodando e se o CORS permite esta porta do frontend.', 0);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Erro de comunicação com a API' }));
    throw new ApiError(body.message || 'Erro de comunicação com a API', response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function downloadUrl(path: string) {
  return `${API_URL}${path}`;
}
