const BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'weeee-admin-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => (token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY));

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, query } = {}) {
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null))}` : '';
  const token = getToken();
  let res;
  try {
    res = await fetch(BASE + path + qs, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Network error — is the API running?');
  }

  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) onUnauthorized();
  if (!res.ok) {
    const detail = data?.details?.map?.((d) => `${d.path}: ${d.message}`).join('; ');
    throw new ApiError(res.status, [data?.error ?? `Request failed (${res.status})`, detail].filter(Boolean).join(' — '), data?.details);
  }
  return data;
}

/**
 * Uploads an image file as the request body (not as a form). The server checks the file's
 * real type and size, stores it in Cloudflare R2, and answers with its public URL.
 */
export async function uploadImage(path, file) {
  const token = getToken();
  const headers = { 'Content-Type': file.type };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(BASE + path, { method: 'POST', headers: headers, body: file });
  } catch {
    throw new ApiError(0, 'Network error — is the API running?');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (response.status === 401 && token) {
    onUnauthorized();
  }
  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    if (response.status === 413) {
      message = 'That image is too large.';
    } else if (data && data.error) {
      message = data.error;
    }
    throw new ApiError(response.status, message);
  }
  return data;
}
