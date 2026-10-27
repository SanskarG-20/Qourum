// Same-origin JSON client shared by the member and organizer screens.

export async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  let body = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const detail = body?.detail;
    const message = Array.isArray(detail) ? detail.map((item) => item.msg).join('; ') : detail;
    throw new Error(typeof message === 'string' && message ? message : `Request failed (${response.status})`);
  }
  return body;
}

export async function csrfToken() {
  const { csrf_token: token } = await api('/api/auth/csrf');
  return token;
}

// State-changing request: attaches a fresh CSRF token and JSON-encodes `body` when given.
export async function apiWrite(path, { method = 'POST', body } = {}) {
  const headers = { 'X-CSRF-Token': await csrfToken() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return api(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
