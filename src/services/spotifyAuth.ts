import { AuthTokens } from '../types';

const STORAGE_KEYS = {
  CLIENT_ID: 'music_cast_client_id',
  ACCESS_TOKEN: 'music_cast_access_token',
  REFRESH_TOKEN: 'music_cast_refresh_token',
  EXPIRES_AT: 'music_cast_expires_at',
  CODE_VERIFIER: 'music_cast_code_verifier',
  AUTH_STATE: 'music_cast_auth_state',
};

const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

/**
 * 登録された、または環境変数の Client ID を取得（URLパラメータからの自動取り込みもサポート）
 */
export function getStoredClientId(): string {
  // 1. URL パラメータに ?client_id=... がある場合、最優先で取り込んで localStorage に保存
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const paramClientId = urlParams.get('client_id');
    if (paramClientId && paramClientId.trim().length > 0) {
      const cleanId = paramClientId.trim();
      setStoredClientId(cleanId);
      // URLから client_id パラメータを消去してクリーンに
      urlParams.delete('client_id');
      const newQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';
      window.history.replaceState({}, document.title, `${window.location.pathname}${newQuery}`);
      return cleanId;
    }
  } catch (_) {}

  // 2. localStorage から取得
  const customId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
  if (customId && customId.trim().length > 0) {
    return customId.trim();
  }

  // 3. 環境変数 (.env) から取得
  return (import.meta.env.VITE_SPOTIFY_CLIENT_ID || '').trim();
}

/**
 * Client ID を保存
 */
export function setStoredClientId(clientId: string): void {
  const trimmed = clientId.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
  }
}

/**
 * 現在のホスティングURLからリダイレクトURIを取得
 */
export function getRedirectUri(): string {
  const url = new URL(window.location.href);
  return `${url.origin}${url.pathname}`;
}

/**
 * ランダムな文字列（verifier用）の生成
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

/**
 * SHA-256 ハッシュを計算
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

/**
 * Base64 URL-safe エンコード
 */
function base64urlencode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Spotify PKCE 認証フローを開始
 */
export async function initiateSpotifyLogin(): Promise<void> {
  const clientId = getStoredClientId();
  if (!clientId) {
    throw new Error('Spotify Client ID が設定されていません。設定画面から入力してください。');
  }

  const verifier = generateRandomString(64);
  const state = generateRandomString(16);
  const hashed = await sha256(verifier);
  const codeChallenge = base64urlencode(hashed);

  // 検証用にローカルストレージへ一時保存
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);
  localStorage.setItem(STORAGE_KEYS.AUTH_STATE, state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: getRedirectUri(),
    state: state,
  });

  window.location.href = `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * リダイレクト戻り時のコールバック処理
 */
export async function handleSpotifyCallback(): Promise<boolean> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');

  if (error) {
    // クエリを消去してエラー
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error(`Spotify認証エラー: ${error}`);
  }

  if (!code) {
    return false;
  }

  const savedState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE);
  const verifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);

  if (!savedState || !verifier || state !== savedState) {
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error('認証状態 (state) が一致しないか、セッションが無効です。');
  }

  const clientId = getStoredClientId();
  if (!clientId) {
    throw new Error('Spotify Client ID が設定されていません。');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error(errData.error_description || 'トークンの取得に失敗しました。');
  }

  const data = await response.json();
  saveTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  // 一時セッションデータを削除
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);

  // URLからクエリパラメータを削除してクリーンアップ
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

/**
 * トークンの保存
 */
export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  }
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, tokens.expiresAt.toString());
}

/**
 * 保存されているトークンを取得
 */
export function getSavedTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '';
  const expiresAtStr = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!accessToken || !expiresAtStr) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: parseInt(expiresAtStr, 10),
  };
}

/**
 * リフレッシュトークンを使って新しいアクセストークンを取得
 */
export async function refreshAccessToken(): Promise<string | null> {
  const tokens = getSavedTokens();
  const clientId = getStoredClientId();

  if (!tokens || !tokens.refreshToken || !clientId) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: tokens.refreshToken,
  });

  try {
    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      // 400等でリフレッシュトークンが無効になった場合はログアウト
      if (response.status === 400) {
        logout();
      }
      return null;
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    saveTokens(newTokens);
    return newTokens.accessToken;
  } catch (error) {
    console.error('トークンリフレッシュエラー:', error);
    return null;
  }
}

/**
 * 有効期限を考慮したアクセストークンの取得（必要に応じて自動リフレッシュ）
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getSavedTokens();
  if (!tokens) return null;

  // 有効期限が1分以上残っていれば現在のトークンを使用
  if (tokens.expiresAt > Date.now() + 60 * 1000) {
    return tokens.accessToken;
  }

  // 期限切れ間近または切れている場合はリフレッシュ
  return await refreshAccessToken();
}

/**
 * ログアウト（トークン消去）
 */
export function logout(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_STATE);
}

/**
 * ログイン中かどうか
 */
export function isAuthenticated(): boolean {
  return !!getSavedTokens();
}
