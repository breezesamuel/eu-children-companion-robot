// Attach the operator's JWT to every axios request and self-heal on 401.
//
// The console's admin pages (用户/设备/学习/安全/系统健康) hit /api/admin/*,
// which the backend protects with RBAC.  Previously nothing ever sent the
// Authorization header, so those pages always 401'd.  This interceptor reads
// the token stored by the login page and, on a 401 for a non-login call, clears
// it and reloads so the operator is asked to sign in again.
import axios from 'axios';

export const TOKEN_KEY = 'admin_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

axios.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = 'Bearer ' + t;
  }
  return cfg;
});

axios.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const url = String(err?.config?.url || '');
    if (status === 401 && !url.includes('/api/auth/login')) {
      clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/console/login');
      }
    }
    return Promise.reject(err);
  },
);

export default axios;
