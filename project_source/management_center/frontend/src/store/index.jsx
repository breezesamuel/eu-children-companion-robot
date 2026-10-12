import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';

const StoreContext = createContext(null);
const DispatchContext = createContext(null);
const SelectorContext = createContext(null);

// --- State Persistence ---
const PERSIST_DOMAINS = ['settings', 'ui'];
const loadPersisted = () => {
  try {
    const data = localStorage.getItem('mgmt_store_persist');
    return data ? JSON.parse(data) : {};
  } catch { return {}; }
};
const savePersisted = (state) => {
  try {
    const toPersist = {};
    PERSIST_DOMAINS.forEach(d => { if (state[d]) toPersist[d] = state[d]; });
    localStorage.setItem('mgmt_store_persist', JSON.stringify(toPersist));
  } catch { /* storage full */ }
};

// --- WebSocket Connection Manager ---
class WSManager {
  constructor(url, onMessage, onStatus) {
    this.url = url; this.onMessage = onMessage; this.onStatus = onStatus;
    this.reconnectAttempts = 0; this.maxReconnect = 10; this.baseDelay = 1000;
    this.ws = null; this.connected = false;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => { this.connected = true; this.reconnectAttempts = 0; this.onStatus('connected'); };
      this.ws.onclose = () => { this.connected = false; this.onStatus('disconnected'); this.reconnect(); };
      this.ws.onerror = () => { this.onStatus('error'); };
      this.ws.onmessage = (event) => {
        try { this.onMessage(JSON.parse(event.data)); }
        catch { /* ignore malformed */ }
      };
    } catch { this.reconnect(); }
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) return;
    const delay = Math.min(this.baseDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  send(data) { if (this.connected) this.ws.send(JSON.stringify(data)); }

  disconnect() { if (this.ws) { this.ws.close(); this.ws = null; } }
}

// --- Middleware ---
const middlewares = [];

function addMiddleware(fn) { middlewares.push(fn); }

function applyMiddleware(action, state, next) {
  let idx = -1;
  function dispatch(i) {
    if (i <= idx) return;
    idx = i;
    if (i >= middlewares.length) return next(action);
    middlewares[i]({ action, state }, () => dispatch(i + 1));
  }
  dispatch(0);
}

// --- Initial State ---
const initialState = {
  user: { data: null, loading: false, error: null },
  devices: { items: [], loading: false, error: null, selected: null },
  content: { items: [], loading: false, error: null, filters: {}, total: 0 },
  analytics: { data: null, loading: false, error: null, period: 'week' },
  learning: { sessions: [], loading: false, error: null, stats: null },
  reports: { items: [], loading: false, error: null, selected: null },
  notifications: { items: [], loading: false, error: null, unreadCount: 0 },
  settings: { data: {}, loading: false, error: null, dirty: false },
  ui: { sidebarCollapsed: false, theme: 'dark', toast: null },
};
Object.assign(initialState, loadPersisted());

// --- Action History for Undo ---
const MAX_HISTORY = 50;
let actionHistory = [];
let historyIndex = -1;

// --- Request Deduplication ---
const pendingRequests = new Map();

function dedupRequest(key, promise) {
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  pendingRequests.set(key, promise);
  promise.finally(() => pendingRequests.delete(key));
  return promise;
}

// --- Offline Queue ---
const offlineQueue = [];
let isOnline = navigator.onLine;

window.addEventListener('online', () => { isOnline = true; flushOfflineQueue(); });
window.addEventListener('offline', () => { isOnline = false; });

function flushOfflineQueue() {
  while (offlineQueue.length > 0) {
    const action = offlineQueue.shift();
    try { action(); } catch { /* skip failed */ }
  }
}

// --- Rate Limiter ---
const rateLimiters = {};
function rateLimit(key, fn, ms = 1000) {
  if (!rateLimiters[key]) rateLimiters[key] = { lastCall: 0, queue: [] };
  const limiter = rateLimiters[key];
  const now = Date.now();
  if (now - limiter.lastCall >= ms) {
    limiter.lastCall = now;
    return fn();
  }
  return new Promise((resolve) => {
    limiter.queue.push(() => {
      limiter.lastCall = Date.now();
      resolve(fn());
    });
    setTimeout(() => {
      const idx = limiter.queue.indexOf(limiter.queue[0]);
      if (idx > -1) { limiter.queue.splice(idx, 1); resolve(Promise.reject(new Error('Rate limited'))); }
    }, ms * 2);
  });
}

// --- Debounced Save ---
const debounceTimers = {};
function debouncedSave(key, fn, ms = 500) {
  clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, ms);
}

// --- Reducer ---
function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, [action.domain]: { ...state[action.domain], loading: true, error: null } };
    case 'SET_DATA':
      return { ...state, [action.domain]: { ...state[action.domain], loading: false, [action.key || 'data']: action.data, error: null } };
    case 'SET_ERROR':
      return { ...state, [action.domain]: { ...state[action.domain], loading: false, error: action.error } };
    case 'SET_SELECTED':
      return { ...state, [action.domain]: { ...state[action.domain], selected: action.id } };
    case 'SET_FILTERS':
      return { ...state, [action.domain]: { ...state[action.domain], filters: { ...state[action.domain].filters, ...action.filters } } };
    case 'APPEND':
      return { ...state, [action.domain]: { ...state[action.domain], items: [...(state[action.domain].items || []), ...action.items], total: action.total ?? state[action.domain].total } };
    case 'UPDATE_ITEM':
      return {
        ...state,
        [action.domain]: {
          ...state[action.domain],
          items: (state[action.domain].items || []).map(item =>
            item.id === action.id ? { ...item, ...action.updates } : item
          ),
        },
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        [action.domain]: {
          ...state[action.domain],
          items: (state[action.domain].items || []).filter(item => item.id !== action.id),
          total: Math.max(0, state[action.domain].total - 1),
          selected: state[action.domain].selected === action.id ? null : state[action.domain].selected,
        },
      };
    case 'SET_UNREAD_COUNT':
      return { ...state, notifications: { ...state.notifications, unreadCount: action.count } };
    case 'SET_DIRTY':
      return { ...state, settings: { ...state.settings, dirty: action.dirty } };
    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.payload } };
    case 'SHOW_TOAST':
      return { ...state, ui: { ...state.ui, toast: action.toast } };
    case 'HIDE_TOAST':
      return { ...state, ui: { ...state.ui, toast: null } };
    case 'RESET_DOMAIN':
      return { ...state, [action.domain]: initialState[action.domain] };
    case 'UNDO': {
      if (historyIndex < 0 || actionHistory.length === 0) return state;
      const entry = actionHistory[historyIndex];
      historyIndex--;
      return { ...state, ...entry.prevState };
    }
    case 'BATCH': {
      let newState = { ...state };
      action.actions.forEach(a => { newState = reducer(newState, a); });
      return newState;
    }
    default:
      return state;
  }
}

// --- API helpers ---
function apiUrl(path, params = {}) {
  const qs = Object.entries(params).filter(([_, v]) => v != null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  return '/api/admin' + path + (qs ? '?' + qs : '');
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers };
  const res = await fetch(apiUrl(path), { ...options, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body ? res.status + ': ' + body.substring(0, 200) : 'HTTP ' + res.status);
  }
  return res.json();
}

// --- Abort Controller Map ---
const abortControllers = new Map();
function cancelRequest(key) {
  if (abortControllers.has(key)) { abortControllers.get(key).abort(); abortControllers.delete(key); }
}

// --- Selectors ---
const selectors = {
  getUser: (state) => state.user?.data,
  getDevices: (state) => state.devices?.items || [],
  getSelectedDevice: (state) => {
    const d = state.devices;
    return d.selected ? d.items.find(i => i.id === d.selected) : null;
  },
  getContent: (state) => state.content?.items || [],
  getFilteredContent: (state) => {
    const items = state.content?.items || [];
    const filters = state.content?.filters || {};
    return items.filter(item => {
      if (filters.subject && item.subject !== filters.subject) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.search && !item.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  },
  getUnreadCount: (state) => state.notifications?.unreadCount || 0,
  getIsLoading: (state, domain) => state[domain]?.loading || false,
  getError: (state, domain) => state[domain]?.error || null,
  isSidebarCollapsed: (state) => state.ui?.sidebarCollapsed || false,
  getTheme: (state) => state.ui?.theme || 'dark',
  getToast: (state) => state.ui?.toast || null,
  getSettings: (state) => state.settings?.data || {},
  isDirty: (state) => state.settings?.dirty || false,
  getLearningStats: (state) => state.learning?.stats || null,
  getAnalyticsData: (state) => state.analytics?.data || null,
};

// --- Store Provider ---
export function StoreProvider({ children, wsUrl }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on state change
  useEffect(() => { savePersisted(state); }, [state]);

  // WebSocket connection
  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WSManager(wsUrl,
      (data) => {
        if (data.type === 'update' && data.domain) {
          dispatch({ type: 'SET_DATA', domain: data.domain, key: data.key || 'data', data: data.payload });
        }
        if (data.type === 'notification') {
          dispatch({ type: 'SET_UNREAD_COUNT', count: stateRef.current.notifications.unreadCount + 1 });
        }
      },
      (status) => {
        if (status === 'disconnected' && stateRef.current.ui.toast?.msg !== 'Reconnecting...') {
          dispatch({ type: 'SHOW_TOAST', toast: { msg: 'Reconnecting...', severity: 'warning', id: Date.now() } });
        }
        if (status === 'connected') {
          dispatch({ type: 'HIDE_TOAST' });
        }
      }
    );
    ws.connect();
    wsRef.current = ws;
    return () => ws.disconnect();
  }, [wsUrl]);

  const coreDispatch = useCallback((action) => {
    if (typeof action === 'function') {
      return action(coreDispatch, () => stateRef.current);
    }

    // Apply middleware
    applyMiddleware(action, stateRef.current, () => {
      // Save for undo
      if (!['SHOW_TOAST', 'HIDE_TOAST', 'SET_LOADING'].includes(action.type)) {
        if (historyIndex < MAX_HISTORY - 1) {
          actionHistory = actionHistory.slice(0, historyIndex + 1);
          actionHistory.push({ type: action.type, prevState: { [action.domain]: stateRef.current[action.domain] } });
          historyIndex = actionHistory.length - 1;
        }
      }
      if (!isOnline && ['CREATE', 'UPDATE', 'DELETE'].includes(action.type?.split('_')[0])) {
        offlineQueue.push(() => dispatch(action));
        return;
      }
      dispatch(action);
    });
  }, []);

  const actions = {
    fetch: useCallback(async (domain, path, key, params = {}) => {
      coreDispatch({ type: 'SET_LOADING', domain });
      try {
        const data = await apiFetch(path, { params });
        coreDispatch({ type: 'SET_DATA', domain, data, key: key || 'data' });
        return data;
      } catch (e) {
        coreDispatch({ type: 'SET_ERROR', domain, error: e.message });
        throw e;
      }
    }, [coreDispatch]),

    fetchList: useCallback(async (domain, path, params = {}) => {
      coreDispatch({ type: 'SET_LOADING', domain });
      try {
        const data = await apiFetch(path, { params });
        coreDispatch({ type: 'SET_DATA', domain, key: 'items', data: data.items || data.data || (Array.isArray(data) ? data : []) });
        if (data.total != null) coreDispatch({ type: 'SET_DATA', domain, key: 'total', data: data.total });
        return data;
      } catch (e) {
        coreDispatch({ type: 'SET_ERROR', domain, error: e.message });
        throw e;
      }
    }, [coreDispatch]),

    create: useCallback(async (domain, path, body) => {
      const data = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
      coreDispatch({ type: 'APPEND', domain, items: [data], total: null });
      return data;
    }, [coreDispatch]),

    update: useCallback(async (domain, path, id, updates) => {
      const data = await apiFetch(path + '/' + id, { method: 'PATCH', body: JSON.stringify(updates) });
      coreDispatch({ type: 'UPDATE_ITEM', domain, id, updates: data });
      return data;
    }, [coreDispatch]),

    remove: useCallback(async (domain, path, id) => {
      await apiFetch(path + '/' + id, { method: 'DELETE' });
      coreDispatch({ type: 'REMOVE_ITEM', domain, id });
    }, [coreDispatch]),

    setSelected: useCallback((domain, id) => coreDispatch({ type: 'SET_SELECTED', domain, id }), [coreDispatch]),
    setFilters: useCallback((domain, filters) => coreDispatch({ type: 'SET_FILTERS', domain, filters }), [coreDispatch]),

    showToast: useCallback((msg, severity) => coreDispatch({ type: 'SHOW_TOAST', toast: { msg, severity, id: Date.now() } }), [coreDispatch]),
    hideToast: useCallback(() => coreDispatch({ type: 'HIDE_TOAST' }), [coreDispatch]),
    setUnreadCount: useCallback((count) => coreDispatch({ type: 'SET_UNREAD_COUNT', count }), [coreDispatch]),
    setDirty: useCallback((dirty) => coreDispatch({ type: 'SET_DIRTY', dirty }), [coreDispatch]),

    setUI: useCallback((payload) => coreDispatch({ type: 'SET_UI', payload }), [coreDispatch]),

    undo: useCallback(() => coreDispatch({ type: 'UNDO' }), [coreDispatch]),

    resetDomain: useCallback((domain) => coreDispatch({ type: 'RESET_DOMAIN', domain }), [coreDispatch]),

    batch: useCallback((actions) => coreDispatch({ type: 'BATCH', actions }), [coreDispatch]),

    // Deduplicated fetch
    dedupFetch: useCallback((domain, path, key, params = {}) => {
      const requestKey = domain + ':' + path + ':' + JSON.stringify(params);
      const promise = actions.fetch(domain, path, key, params);
      return dedupRequest(requestKey, promise);
    }, [actions]),

    // Rate-limited action
    rateLimitedAction: useCallback((key, fn, ms) => {
      return rateLimit(key, fn, ms);
    }, []),

    // Debounced update
    debouncedUpdate: useCallback((domain, path, id, updates) => {
      const saveKey = domain + ':' + id;
      debouncedSave(saveKey, () => actions.update(domain, path, id, updates), 500);
    }, [actions]),

    // Cancel request
    cancelRequest: useCallback((key) => cancelRequest(key), []),

    // WebSocket send
    wsSend: useCallback((data) => { if (wsRef.current) wsRef.current.send(data); }, []),

    // Reconnect WebSocket
    wsReconnect: useCallback(() => { if (wsRef.current) { wsRef.current.disconnect(); wsRef.current.connect(); } }, []),
  };

  return (
    <DispatchContext.Provider value={actions}>
      <StoreContext.Provider value={state}>
        <SelectorContext.Provider value={selectors}>
          {state.ui.toast && (
            <div style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
              padding: '12px 24px', borderRadius: 8,
              background: state.ui.toast.severity === 'error' ? '#dc2626' : state.ui.toast.severity === 'success' ? '#16a34a' : state.ui.toast.severity === 'warning' ? '#d97706' : '#2563eb',
              color: '#fff', fontSize: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', animation: 'slideIn 0.3s ease',
            }}>
              {state.ui.toast.msg}
              <button onClick={() => coreDispatch({ type: 'HIDE_TOAST' })}
                style={{ marginLeft: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>&#10005;</button>
            </div>
          )}
          {children}
        </SelectorContext.Provider>
      </StoreContext.Provider>
    </DispatchContext.Provider>
  );
}

// --- Hooks ---
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useDispatch() {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error('useDispatch must be used within StoreProvider');
  return ctx;
}

export function useSelect(selector) {
  const state = useStore();
  return selector(state);
}

export function useDomain(domain) {
  const state = useStore();
  return state[domain] || {};
}

// --- Error Boundary ---
export class StoreErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#6b7280' }}>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} style={{
            padding: '8px 24px', border: 'none', borderRadius: 8, background: '#4f46e5',
            color: '#fff', cursor: 'pointer', fontWeight: 600, marginTop: 12,
          }}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export { apiFetch, apiUrl, addMiddleware, WSManager };
