import React from 'react';
import { Music, Eye, EyeOff, Settings, LogIn, LogOut, Sparkles, Mic, Maximize, Minimize } from 'lucide-react';
import { initiateSpotifyLogin, logout, isAuthenticated, getStoredClientId } from '../services/spotifyAuth';

interface HeaderProps {
  isWakeLocked: boolean;
  onToggleWakeLock: () => void;
  wakeLockSupported: boolean;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenSettings: () => void;
  isLyricsMode: boolean;
  onToggleLyricsMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isWakeLocked,
  onToggleWakeLock,
  wakeLockSupported,
  isDemoMode,
  onToggleDemoMode,
  onOpenSettings,
  isLyricsMode,
  onToggleLyricsMode,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const isAuth = isAuthenticated();

  const handleAuthAction = async () => {
    if (isAuth) {
      logout();
      window.location.reload();
    } else {
      const clientId = getStoredClientId();
      if (!clientId) {
        onOpenSettings();
        return;
      }
      try {
        await initiateSpotifyLogin();
      } catch (err: any) {
        alert(err.message || 'ログイン開始に失敗しました。');
      }
    }
  };

  return (
    <header
      className="h-13 md:h-16 landscape:max-md:h-10 px-3 md:px-8 flex items-center justify-between z-20 backdrop-blur-md bg-black/40 border-b border-white/5 shrink-0 select-none transition-all duration-200"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      {/* ロゴとアプリタイトル */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-tr from-spotify-green to-emerald-400 flex items-center justify-center shadow-lg shadow-spotify-green/20 shrink-0">
          <Music className="w-3.5 h-3.5 md:w-4 md:h-4 text-black font-extrabold" />
        </div>
        <div>
          <span className="text-sm md:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            <span className="hidden xs:inline sm:inline">Music Cast</span>
            {isDemoMode && (
              <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded-full">
                Demo
              </span>
            )}
          </span>
        </div>
      </div>

      {/* アクションボタン群 */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* 歌詞表示モード切替ボタン */}
        <button
          onClick={onToggleLyricsMode}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition duration-200 border ${
            isLyricsMode
              ? 'bg-spotify-green/20 text-spotify-green border-spotify-green/40 shadow-sm shadow-spotify-green/10'
              : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title={isLyricsMode ? '歌詞表示モード: ON' : '歌詞表示モード: OFF'}
        >
          <Mic className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">歌詞モード</span>
        </button>

        {/* フルスクリーン（ブラウザ全画面）ボタン */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 sm:p-2 rounded-full text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
          title={isFullscreen ? '全画面を解除' : '全画面表示'}
          aria-label="全画面表示"
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
        </button>

        {/* WakeLock (常時点灯) ボタン */}
        {wakeLockSupported && (
          <button
            onClick={onToggleWakeLock}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition duration-200 border ${
              isWakeLocked
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title={isWakeLocked ? '画面常時点灯: ON' : '画面常時点灯: OFF'}
          >
            {isWakeLocked ? <Eye className="w-3.5 h-3.5 text-amber-300" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">常時点灯 {isWakeLocked ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* デモモード切替ボタン */}
        <button
          onClick={onToggleDemoMode}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition duration-200 border ${
            isDemoMode
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title="デモ楽曲モードのON/OFF"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">デモ</span>
        </button>

        {/* 設定ボタン */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 sm:p-2 rounded-full text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
          title="設定"
          aria-label="設定"
        >
          <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>

        {/* ログイン / ログアウトボタン */}
        <button
          onClick={handleAuthAction}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition duration-200 shadow-md ${
            isAuth
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/10'
              : 'bg-spotify-green hover:brightness-110 text-black shadow-spotify-green/20'
          }`}
        >
          {isAuth ? (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ログアウト</span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Spotify 連携</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
