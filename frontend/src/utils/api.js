export const api = (path, options = {}) =>
  fetch(import.meta.env.VITE_BACKEND_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(r => r.json());
