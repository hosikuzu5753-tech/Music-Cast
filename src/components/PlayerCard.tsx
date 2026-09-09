import { Play, Pause, SkipBack, SkipForward, Disc3, Music2, RefreshCw, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SpotifyTrack } from '../types';
import { formatTime } from '../utils/lrcParser';

interface PlayerCardProps {
  track: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isDemoMode?: boolean;
  onSwitchDemoTrack?: () => void;
  onOpenSettings?: () => void;
  onToggleLyricsMode?: () => void;
  className?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  track,
  isPlaying,
  progressMs,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  isDemoMode = false,
  onSwitchDemoTrack,
  onOpenSettings,
  onToggleLyricsMode,
  className = '',
}) => {
  const durationMs = track?.duration_ms || 1;
  const progressPercent = Math.min(100, Math.max(0, (progressMs / durationMs) * 100));

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!track) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * durationMs);
  };

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-900/40 border border-white/5 rounded-3xl backdrop-blur-xl text-center h-full max-h-[550px]">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 text-neutral-500 animate-pulse">
          <Disc3 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">再生中の楽曲がありません</h3>
        <p className="text-sm text-neutral-400 max-w-xs mb-6">
          Spotifyアプリで音楽を再生するか、右上の「デモモード」をお試しください。
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onOpenSettings}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium text-white transition"
          >
            Spotify Client ID 設定を確認
          </button>
        </div>
      </div>
    );
  }

  const albumImage = track.album?.images?.[0]?.url;
  const artistNames = track.artists?.map((a) => a.name).join(', ') || '不明なアーティスト';

  return (
    <div
      className={`flex flex-col justify-between p-4 sm:p-6 md:p-8 landscape:max-md:p-3.5 bg-neutral-900/40 border border-white/10 rounded-3xl landscape:max-md:rounded-2xl backdrop-blur-2xl shadow-2xl w-full max-w-md mx-auto md:portrait:max-w-lg md:portrait:p-4 shrink-0 transition-all duration-200 ${className}`}
    >
      {/* アルバムジャケット */}
      <div className="relative aspect-square w-full max-w-[260px] sm:max-w-[320px] md:max-w-none landscape:max-md:w-24 landscape:max-md:h-24 md:portrait:w-36 md:portrait:h-36 mx-auto rounded-2xl landscape:max-md:rounded-xl overflow-hidden shadow-2xl shadow-black/80 mb-4 sm:mb-6 landscape:max-md:mb-2 md:portrait:mb-2 bg-black/30 border border-white/5 group shrink-0">
        <AnimatePresence mode="wait">
          {albumImage ? (
            <motion.img
              key={albumImage}
              src={albumImage}
              alt={track.name}
              className="w-full h-full object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-500">
              <Music2 className="w-12 h-12 sm:w-16 sm:h-16" />
            </div>
          )}
        </AnimatePresence>

        {/* 再生中インジケータ */}
        {isPlaying && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-medium text-spotify-green flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-spotify-green animate-ping" />
            <span>再生中</span>
          </div>
        )}
      </div>

      {/* 楽曲タイトル & アーティスト */}
      <div className="mb-3 sm:mb-5 landscape:max-md:mb-1.5 md:portrait:mb-2 text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate mb-0.5 landscape:max-md:text-sm md:portrait:text-lg">
          {track.name}
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-neutral-300 font-medium truncate landscape:max-md:text-[11px] md:portrait:text-xs">
          {artistNames}
        </p>
        {track.album?.name && (
          <p className="hidden sm:block text-[11px] sm:text-xs text-neutral-500 truncate mt-0.5 landscape:max-md:hidden">
            {track.album.name}
          </p>
        )}
      </div>

      {/* プログレスバー */}
      <div className="mb-3 sm:mb-5 landscape:max-md:mb-1.5 md:portrait:mb-2">
        <div
          onClick={handleProgressBarClick}
          className="relative h-1.5 sm:h-2 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-all group py-1 -my-1"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-spotify-green rounded-full transition-colors group-hover:bg-emerald-400"
            style={{ width: `${progressPercent}%` }}
          />
          {/* シークつまみ */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 sm:w-3.5 h-3 sm:h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] sm:text-xs text-neutral-400 font-mono mt-1">
          <span>{formatTime(progressMs)}</span>
          <span>{formatTime(durationMs)}</span>
        </div>
      </div>

      {/* 再生コントロール */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 landscape:max-md:gap-2">
        {/* 前の曲 */}
        <button
          onClick={onPrev}
          className="p-2 sm:p-3 landscape:max-md:p-1.5 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
          title="前の曲 / 先頭に戻る"
        >
          <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        </button>

        {/* 再生 / 一時停止 */}
        <button
          onClick={onTogglePlay}
          className="p-3 sm:p-4 landscape:max-md:p-2 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition shadow-lg shadow-white/10 flex items-center justify-center"
          title={isPlaying ? '一時停止' : '再生'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 sm:w-6 sm:h-6 landscape:max-md:w-4 landscape:max-md:h-4 fill-current" />
          ) : (
            <Play className="w-5 h-5 sm:w-6 sm:h-6 landscape:max-md:w-4 landscape:max-md:h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* 次の曲 */}
        <button
          onClick={onNext}
          className="p-2 sm:p-3 landscape:max-md:p-1.5 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition active:scale-95"
          title="次の曲"
        >
          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
        </button>

        {/* デモ曲切替ボタン（デモモード時のみ） */}
        {isDemoMode && onSwitchDemoTrack && (
          <button
            onClick={onSwitchDemoTrack}
            className="p-2 sm:p-2.5 landscape:max-md:p-1.5 text-neutral-400 hover:text-purple-300 rounded-full hover:bg-purple-500/10 transition border border-purple-500/20"
            title="次のデモ曲へ切り替え"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      {/* 歌詞表示モードへの遷移ボタン（スマホ縦向き時のみ表示） */}
      {onToggleLyricsMode && (
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-white/5 portrait:max-md:flex hidden justify-center">
          <button
            onClick={onToggleLyricsMode}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition border border-white/5 shadow-sm"
          >
            <Mic className="w-3.5 h-3.5 text-spotify-green" />
            <span>歌詞を全画面で表示する</span>
          </button>
        </div>
      )}
    </div>
  );
};
