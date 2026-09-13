export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbumImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyAlbumImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri?: string;
}

export interface CurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number;
  timestamp: number;
  item: SpotifyTrack | null;
  currently_playing_type?: string;
}

export interface LyricLine {
  id: number;
  timeMs: number;
  text: string;
}

export interface LyricsData {
  syncedLyrics: LyricLine[];
  plainLyrics?: string;
  isInstrumental: boolean;
  source: 'lrclib' | 'demo' | 'none';
  offsetMs?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

export type LyricFontSize = 'small' | 'medium' | 'large' | 'xlarge';

