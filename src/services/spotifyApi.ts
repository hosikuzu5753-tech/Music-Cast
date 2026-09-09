import { CurrentlyPlaying } from '../types';
import { getValidAccessToken, logout } from './spotifyAuth';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

/**
 * 共通フェッチラッパー（認証ヘッダー付与、401時の自動ハンドリング）
 */
async function spotifyFetch(endpoint: string, options: RequestInit = {}): Promise<Response | null> {
  const token = await getValidAccessToken();
  if (!token) {
    return null;
  }

  const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 401) {
    logout();
    return null;
  }

  return res;
}

/**
 * 現在再生中の楽曲情報を取得
 */
export async function fetchCurrentlyPlaying(): Promise<CurrentlyPlaying | null> {
  try {
    const res = await spotifyFetch('/me/player/currently-playing');
    if (!res) return null;

    // 204: 再生中の曲がない、またはSpotifyが休止状態
    if (res.status === 204) {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || !data.item) {
      return null;
    }

    return {
      is_playing: data.is_playing,
      progress_ms: data.progress_ms,
      timestamp: data.timestamp || Date.now(),
      item: data.item,
      currently_playing_type: data.currently_playing_type,
    };
  } catch (error) {
    console.error('Spotify API fetch error:', error);
    return null;
  }
}

/**
 * 指定位置（ms）へシーク（歌詞タップジャンプ用）
 */
export async function seekToPosition(positionMs: number): Promise<boolean> {
  try {
    const res = await spotifyFetch(`/me/player/seek?position_ms=${Math.floor(positionMs)}`, {
      method: 'PUT',
    });
    return !!res && (res.status === 204 || res.ok);
  } catch (error) {
    console.error('Spotify seek error:', error);
    return false;
  }
}

/**
 * 再生 / 一時停止の切り替え
 */
export async function setPlaybackState(play: boolean): Promise<boolean> {
  try {
    const endpoint = play ? '/me/player/play' : '/me/player/pause';
    const res = await spotifyFetch(endpoint, {
      method: 'PUT',
    });
    return !!res && (res.status === 204 || res.ok);
  } catch (error) {
    console.error('Spotify play/pause error:', error);
    return false;
  }
}

/**
 * 次の曲へスキップ
 */
export async function skipToNext(): Promise<boolean> {
  try {
    const res = await spotifyFetch('/me/player/next', {
      method: 'POST',
    });
    return !!res && (res.status === 204 || res.ok);
  } catch (error) {
    console.error('Spotify skip next error:', error);
    return false;
  }
}

/**
 * 前の曲へスキップ
 */
export async function skipToPrevious(): Promise<boolean> {
  try {
    const res = await spotifyFetch('/me/player/previous', {
      method: 'POST',
    });
    return !!res && (res.status === 204 || res.ok);
  } catch (error) {
    console.error('Spotify skip previous error:', error);
    return false;
  }
}
