const API_BASE = typeof window !== 'undefined'
  ? `${window.location.origin}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1');

const WS_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : (() => {
      try {
        const url = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1');
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${url.host}`;
      } catch {
        return 'ws://localhost:8080';
      }
    })();

export { API_BASE, WS_BASE };
export async function apiFetch(url: string, options: RequestInit = {}) {
  let resolvedUrl = url;

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    // Replace any localhost or 127.0.0.1 host with current origin
    resolvedUrl = resolvedUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):8443/g, currentOrigin);
    resolvedUrl = resolvedUrl.replace(/http:\/\/localhost:8080/g, currentOrigin);

    if (process.env.NEXT_PUBLIC_API_URL && resolvedUrl.includes(process.env.NEXT_PUBLIC_API_URL)) {
      resolvedUrl = resolvedUrl.replace(process.env.NEXT_PUBLIC_API_URL, `${currentOrigin}/api/v1`);
    }
  } else if (process.env.NEXT_PUBLIC_API_URL) {
    resolvedUrl = resolvedUrl.replace(process.env.NEXT_PUBLIC_API_URL, API_BASE);
  }

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (API_BASE.includes('ngrok')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  const response = await fetch(resolvedUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  const isLoginRequest = resolvedUrl.includes('/login');

  if (response.status === 401 && !isLoginRequest) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login?error=session_expired';
    return Promise.reject('Unauthorized');
  }

  return response;
}

export async function logout() {
  try {
    await apiFetch(`${API_BASE}/logout`, { method: 'POST' });
  } catch {}
  finally {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }
}

export async function getApproverEmails(): Promise<string[]> {
  try {
    const response = await apiFetch(`${API_BASE}/approvers-emails`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}