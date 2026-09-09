import { useState, useEffect, useRef, useCallback } from 'react';
import { SpotifyTrack, CurrentlyPlaying } from '../types';
import { fetchCurrentlyPlaying, setPlaybackState, seekToPosition, skipToNext, skipToPrevious } from '../services/spotifyApi';
import { isAuthenticated } from '../services/spotifyAuth';
import { DEMO_TRACKS } from '../mock/demoData';

interface UseNowPlayingProps {
  isDemoMode: boolean;
  demoTrackIndex?: number;
}

export function useNowPlaying({ isDemoMode, demoTrackIndex = 0 }: UseNowPlayingProps) {
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [smoothProgressMs, setSmoothProgressMs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // サーバー同期用の参照値（performance.now() を基準にして高精度・単調増加を保証）
  const lastSyncProgressRef = useRef(0);
  const lastSyncTimeRef = useRef(performance.now());
  const isPlayingRef = useRef(false);
  const currentTrackRef = useRef<SpotifyTrack | null>(null);

  // デモモードの状態管理
  const demoIndexRef = useRef(demoTrackIndex);
  demoIndexRef.current = demoTrackIndex;

  // デモモード切り替え時の初期化
  useEffect(() => {
    if (isDemoMode) {
      const demo = DEMO_TRACKS[demoTrackIndex % DEMO_TRACKS.length];
      setCurrentTrack(demo.track);
      currentTrackRef.current = demo.track;
      setIsPlaying(false);
      isPlayingRef.current = false;
      lastSyncProgressRef.current = 0;
      lastSyncTimeRef.current = performance.now();
      setSmoothProgressMs(0);
      setIsLoading(false);
    }
  }, [isDemoMode, demoTrackIndex]);

  // Spotify API ポーリング処理（Spotify再生モード）
  useEffect(() => {
    if (isDemoMode) return;

    let isMounted = true;

    const poll = async () => {
      if (!isAuthenticated()) {
        if (isMounted) {
          setCurrentTrack(null);
          currentTrackRef.current = null;
          setIsPlaying(false);
          isPlayingRef.current = false;
          setIsLoading(false);
        }
        return;
      }

      try {
        const data: CurrentlyPlaying | null = await fetchCurrentlyPlaying();
        if (!isMounted) return;

        if (data && data.item) {
          // 曲が変わった場合
          if (!currentTrackRef.current || currentTrackRef.current.id !== data.item.id) {
            setCurrentTrack(data.item);
            currentTrackRef.current = data.item;
          }

          const playing = Boolean(data.is_playing);
          const serverProgress = typeof data.progress_ms === 'number' ? data.progress_ms : 0;
          const nowPerf = performance.now();

          setIsPlaying(playing);
          isPlayingRef.current = playing;

          // サーバーの実測値を常に正解基準点として記録
          lastSyncProgressRef.current = serverProgress;
          lastSyncTimeRef.current = nowPerf;
          setSmoothProgressMs(serverProgress);
        } else {
          // Spotifyで何も再生されていない、または休止状態
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      } catch (err) {
        console.error('Spotify polling error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    poll();
    // 1秒間隔でポーリング
    const interval = setInterval(poll, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isDemoMode]);

  // スムーズな進捗補間ループ（再生中のみローカルで経過時間を加算）
  useEffect(() => {
    const timer = setInterval(() => {
      // 一時停止中、またはトラックが存在しない場合は進めない
      if (!isPlayingRef.current || !currentTrackRef.current) return;

      const elapsed = performance.now() - lastSyncTimeRef.current;
      const nextProgress = lastSyncProgressRef.current + elapsed;
      const duration = currentTrackRef.current.duration_ms;

      if (nextProgress >= duration) {
        if (isDemoMode) {
          // デモモード時は曲頭にループ
          lastSyncProgressRef.current = 0;
          lastSyncTimeRef.current = performance.now();
          setSmoothProgressMs(0);
        } else {
          setSmoothProgressMs(duration);
        }
      } else {
        setSmoothProgressMs(Math.floor(nextProgress));
      }
    }, 50);

    return () => clearInterval(timer);
  }, [isDemoMode]);

  // シーク操作
  const seek = useCallback(
    async (targetMs: number) => {
      const clamped = Math.max(0, Math.min(targetMs, currentTrack?.duration_ms || targetMs));
      lastSyncProgressRef.current = clamped;
      lastSyncTimeRef.current = performance.now();
      setSmoothProgressMs(clamped);

      if (!isDemoMode && isAuthenticated()) {
        await seekToPosition(clamped);
      }
    },
    [currentTrack, isDemoMode]
  );

  // 再生 / 一時停止
  const togglePlay = useCallback(async () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    isPlayingRef.current = nextState;

    if (nextState) {
      lastSyncTimeRef.current = performance.now();
    } else {
      lastSyncProgressRef.current = smoothProgressMs;
    }

    if (!isDemoMode && isAuthenticated()) {
      await setPlaybackState(nextState);
    }
  }, [isPlaying, smoothProgressMs, isDemoMode]);

  // 次の曲
  const next = useCallback(async () => {
    if (isDemoMode) return;
    if (isAuthenticated()) {
      await skipToNext();
    }
  }, [isDemoMode]);

  // 前の曲
  const prev = useCallback(async () => {
    if (isDemoMode) {
      seek(0);
      return;
    }
    if (isAuthenticated()) {
      await skipToPrevious();
    }
  }, [isDemoMode, seek]);

  return {
    currentTrack,
    isPlaying,
    progressMs: smoothProgressMs,
    isLoading,
    seek,
    togglePlay,
    next,
    prev,
  };
}
