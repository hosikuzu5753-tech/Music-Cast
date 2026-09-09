import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Music2, Maximize2, Minimize2 } from 'lucide-react';
import { SpotifyTrack } from '../types';
import { formatTime } from '../utils/lrcParser';

interface MiniPlayerProps {
  track: SpotifyTrack | null;
  isPlaying: boolean;
  progressMs: number;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyricsMode: () => void;
  isLyricsMode: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  isPlaying,
  progressMs,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  onToggleLyricsMode,
  isLyricsMode,
  position = 'bottom',
  className = '',
}) => {
  if (!track) return null;

  const durationMs = track.duration_ms || 1;
  const progressPercent = Math.min(100, Math.max(0, (progressMs / durationMs) * 100));
  const albumImage = track.album?.images?.[0]?.url;
  const artistNames = track.artists?.map((a) => a.name).join(', ') || '不明なアーティスト';

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * durationMs);
  };

  return (
    <div className={`w-full max-w-2xl mx-auto px-2 sm:px-4 z-20 shrink-0 ${position === 'top' ? 'pt-1 pb-2' : 'pb-2'} ${className}`}>
      <div className="bg-neutral-900/85 hover:bg-neutral-900/95 border border-white/10 rounded-2xl p-2 sm:p-2.5 backdrop-blur-2xl shadow-2xl transition duration-200">
        {/* プログレスバー（最上部の極薄スライダー） */}
        <div
          onClick={handleProgressBarClick}
          className="relative h-1.5 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-all mb-2 py-1 -my-1 group"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-spotify-green rounded-full transition-colors group-hover:bg-emerald-400"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* コントロール & 情報行 */}
        <div className="flex items-center justify-between gap-3">
          {/* 左: サムネイル + 楽曲情報 */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-md">
              {albumImage ? (
                <img src={albumImage} alt={track.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  <Music2 className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                {track.name}
              </h4>
              <p className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5">
                {artistNames}
              </p>
            </div>
          </div>

          {/* 中央: 再生コントロール */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={onPrev}
              className="p-1.5 sm:p-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition"
              title="前の曲"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2 sm:p-2.5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition shadow-md flex items-center justify-center"
              title={isPlaying ? '一時停止' : '再生'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="p-1.5 sm:p-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition"
              title="次の曲"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* 右: 時間表示 & モード切替ボタン */}
          <div className="flex items-center gap-2 shrink-0 pl-1 border-l border-white/10">
            <span className="hidden sm:inline text-[11px] font-mono text-neutral-400">
              {formatTime(progressMs)} / {formatTime(durationMs)}
            </span>
            <button
              onClick={onToggleLyricsMode}
              className="p-1.5 sm:p-2 text-neutral-300 hover:text-white rounded-full hover:bg-white/10 transition"
              title={isLyricsMode ? '標準モードに戻る' : '歌詞全画面モード'}
            >
              {isLyricsMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
