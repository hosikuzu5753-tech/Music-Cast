import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PlayerCard } from './components/PlayerCard';
import { LyricViewer } from './components/LyricViewer';
import { MiniPlayer } from './components/MiniPlayer';
import { SettingsModal } from './components/SettingsModal';
import { Layout } from './components/Layout';
import { useWakeLock } from './hooks/useWakeLock';
import { useNowPlaying } from './hooks/useNowPlaying';
import { useLyricSync } from './hooks/useLyricSync';
import { handleSpotifyCallback, isAuthenticated, getStoredClientId } from './services/spotifyAuth';
import { DEMO_TRACKS } from './mock/demoData';

const OFFSET_STORAGE_KEY = 'music_cast_lyric_offset';

export const App: React.FC = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTrackIndex, setDemoTrackIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLyricsMode, setIsLyricsMode] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'player' | 'lyrics'>('player');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [offsetMs, setOffsetMs] = useState<number>(() => {
    const saved = localStorage.getItem(OFFSET_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  // WakeLock
  const { isSupported: wakeLockSupported, isActive: isWakeLocked, toggleWakeLock } = useWakeLock();

  // フルスクリーン状態の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // 初回マウント時のコールバック処理 & 認証状態チェック
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('code')) {
        try {
          await handleSpotifyCallback();
          setIsDemoMode(false);
        } catch (err: any) {
          alert(err.message || '認証の完了に失敗しました。');
        }
      } else {
        // 未認証かつClient ID未設定の場合は、最初からデモモードにして動作を見せる
        if (!isAuthenticated() && !getStoredClientId()) {
          setIsDemoMode(true);
        }
      }
    };

    checkAuth();
  }, []);

  const handleOffsetChange = (newOffset: number) => {
    setOffsetMs(newOffset);
    localStorage.setItem(OFFSET_STORAGE_KEY, newOffset.toString());
  };

  // 楽曲情報の取得
  const {
    currentTrack,
    isPlaying,
    progressMs,
    seek,
    togglePlay,
    next,
    prev,
  } = useNowPlaying({
    isDemoMode,
    demoTrackIndex,
  });

  // 歌詞の同期
  const { lyricsData, activeLineIndex, isLoading: lyricsLoading } = useLyricSync({
    track: currentTrack,
    progressMs,
    offsetMs,
    isDemoMode,
    demoTrackIndex,
  });

  const handleSwitchDemoTrack = () => {
    setDemoTrackIndex((prev) => (prev + 1) % DEMO_TRACKS.length);
  };

  const handleToggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  const handleToggleLyricsMode = () => {
    setIsLyricsMode((prev) => !prev);
    // 歌詞モードONにした際はモバイルタブも歌詞に連動
    setActiveMobileTab('lyrics');
  };

  const albumImageUrl = currentTrack?.album?.images?.[0]?.url;

  return (
    <>
      <Layout
        albumImageUrl={albumImageUrl}
        isLyricsMode={isLyricsMode}
        activeMobileTab={activeMobileTab}
        onChangeMobileTab={setActiveMobileTab}
        header={
          <Header
            isWakeLocked={isWakeLocked}
            onToggleWakeLock={toggleWakeLock}
            wakeLockSupported={wakeLockSupported}
            isDemoMode={isDemoMode}
            onToggleDemoMode={handleToggleDemoMode}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isLyricsMode={isLyricsMode}
            onToggleLyricsMode={handleToggleLyricsMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
          />
        }
        player={
          <PlayerCard
            track={currentTrack}
            isPlaying={isPlaying}
            progressMs={progressMs}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onNext={next}
            onPrev={prev}
            isDemoMode={isDemoMode}
            onSwitchDemoTrack={handleSwitchDemoTrack}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleLyricsMode={handleToggleLyricsMode}
          />
        }
        lyrics={
          <LyricViewer
            lyricsData={lyricsData}
            activeLineIndex={activeLineIndex}
            isLoading={lyricsLoading}
            onSeek={seek}
            isLyricsMode={isLyricsMode}
          />
        }
        miniPlayer={
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            progressMs={progressMs}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onNext={next}
            onPrev={prev}
            onToggleLyricsMode={handleToggleLyricsMode}
            isLyricsMode={isLyricsMode}
            position="top"
          />
        }
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        offsetMs={offsetMs}
        onOffsetChange={handleOffsetChange}
      />
    </>
  );
};

export default App;
