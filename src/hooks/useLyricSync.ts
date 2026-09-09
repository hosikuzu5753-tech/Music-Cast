import { useState, useEffect, useMemo, useRef } from 'react';
import { SpotifyTrack, LyricsData } from '../types';
import { fetchLyrics } from '../services/lyricsApi';
import { DEMO_TRACKS } from '../mock/demoData';
import { parseLrc } from '../utils/lrcParser';

interface UseLyricSyncProps {
  track: SpotifyTrack | null;
  progressMs: number;
  offsetMs?: number; // 歌詞の進み/遅れ微調整
  isDemoMode?: boolean;
  demoTrackIndex?: number;
}

export function useLyricSync({
  track,
  progressMs,
  offsetMs = 0,
  isDemoMode = false,
  demoTrackIndex = 0,
}: UseLyricSyncProps) {
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchedTrackIdRef = useRef<string | null>(null);

  // 歌詞の取得
  useEffect(() => {
    if (!track) {
      setLyricsData(null);
      lastFetchedTrackIdRef.current = null;
      return;
    }

    if (isDemoMode) {
      const demo = DEMO_TRACKS[demoTrackIndex % DEMO_TRACKS.length];
      const parsed = parseLrc(demo.lrc);
      setLyricsData({
        syncedLyrics: parsed,
        isInstrumental: false,
        source: 'demo',
      });
      return;
    }

    // すでに同じトラックを取得済みの場合はスキップ
    if (lastFetchedTrackIdRef.current === track.id) {
      return;
    }

    let isMounted = true;
    lastFetchedTrackIdRef.current = track.id;
    setIsLoading(true);

    const primaryArtist = track.artists[0]?.name || '';
    const albumName = track.album?.name;

    fetchLyrics(track.name, primaryArtist, albumName, track.duration_ms)
      .then((data) => {
        if (isMounted) {
          setLyricsData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load lyrics:', err);
        if (isMounted) {
          setLyricsData({ syncedLyrics: [], isInstrumental: false, source: 'none' });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [track?.id, isDemoMode, demoTrackIndex]);

  // 現在アクティブな歌詞行のインデックスを計算
  const activeLineIndex = useMemo(() => {
    if (!lyricsData || lyricsData.syncedLyrics.length === 0) {
      return -1;
    }

    // オフセットを加算（ユーザーが設定した値のみ適用）
    const effectiveTime = progressMs + offsetMs;
    const lines = lyricsData.syncedLyrics;

    let activeIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timeMs <= effectiveTime) {
        activeIdx = i;
      } else {
        break;
      }
    }

    return activeIdx;
  }, [lyricsData, progressMs, offsetMs]);

  return {
    lyricsData,
    activeLineIndex,
    isLoading,
  };
}
