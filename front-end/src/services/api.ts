import { getSession } from './sessionStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const session = await getSession();
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const raw = await response.text();
  let payload: { detail?: string; message?: string } & T;
  try {
    payload = raw ? (JSON.parse(raw) as typeof payload) : ({} as typeof payload);
  } catch {
    throw new ApiError(`The server returned invalid JSON (${response.status}).`, response.status);
  }
  if (!response.ok) {
    throw new ApiError(
      typeof payload.detail === 'string' ? payload.detail : `Request failed (${response.status}).`,
      response.status,
    );
  }
  return payload;
}

export const api = {
  request,
  get baseUrl() {
    return API_BASE_URL;
  },
};
