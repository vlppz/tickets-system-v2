export function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export function csrfHeaders(headers = {}) {
  const token = getCsrfToken();
  if (!token) return headers;

  return {
    ...headers,
    'X-CSRF-Token': token
  };
}

export function updateCsrfToken(token) {
  if (!token) return;

  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    meta.setAttribute('content', token);
  }
}
