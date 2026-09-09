import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic2, Radio, AlignLeft, RefreshCw, ChevronDown } from 'lucide-react';
import { LyricsData } from '../types';

interface LyricViewerProps {
  lyricsData: LyricsData | null;
  activeLineIndex: number;
  isLoading: boolean;
  onSeek: (ms: number) => void;
  isLyricsMode?: boolean;
}

export const LyricViewer: React.FC<LyricViewerProps> = ({
  lyricsData,
  activeLineIndex,
  isLoading,
  onSeek,
  isLyricsMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<any>(null);
  const isInitialMountRef = useRef(true);

  // アクティブ行の位置へコンテナをスクロール（中央揃え）
  const scrollToLine = useCallback((index: number, smooth: boolean = true) => {
    const container = containerRef.current;
    if (!container) return;

    if (index < 0) {
      // イントロ中（最初の歌詞より前）は最上部へ
      container.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
      return;
    }

    const lineEl = lineRefs.current[index];
    if (!lineEl) return;

    const containerHeight = container.clientHeight;
    const lineTop = lineEl.offsetTop;
    const lineHeight = lineEl.clientHeight;

    // 行がコンテナの垂直方向の中央に来るように計算
    const targetScrollTop = lineTop - containerHeight / 2 + lineHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // activeLineIndex が変わった時、ユーザーが手動スクロール中でなければ自動追従
  useEffect(() => {
    if (userIsScrolling) return;

    const isFirst = isInitialMountRef.current;
    if (isFirst) {
      isInitialMountRef.current = false;
      // 初回表示時はアニメーションなしですぐに現在の位置へ合わせる
      scrollToLine(activeLineIndex, false);
    } else {
      scrollToLine(activeLineIndex, true);
    }
  }, [activeLineIndex, userIsScrolling, scrollToLine]);

  // 歌詞データが切り替わったときの初期化
  useEffect(() => {
    isInitialMountRef.current = true;
    setUserIsScrolling(false);
    scrollToLine(activeLineIndex, false);
  }, [lyricsData, scrollToLine, activeLineIndex]);

  // ユーザーの物理的な操作（マウスホイール、タッチスワイプ）のみを手動スクロールとして検知
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleUserInteraction = () => {
      setUserIsScrolling(true);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      // ユーザー操作が止まって2.5秒後に自動スクロールを再開して現在位置に戻す
      userScrollTimeoutRef.current = setTimeout(() => {
        setUserIsScrolling(false);
      }, 2500);
    };

    container.addEventListener('wheel', handleUserInteraction, { passive: true });
    container.addEventListener('touchmove', handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserInteraction);
      container.removeEventListener('touchmove', handleUserInteraction);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // 手動スクロール中から手動で即座に現在位置へ復帰
  const handleResume = () => {
    setUserIsScrolling(false);
    scrollToLine(activeLineIndex, true);
  };

  // 1. ローディング状態
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 text-neutral-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-spotify-green" />
        <p className="text-sm tracking-wide">歌詞を読み込み中...</p>
      </div>
    );
  }

  // 2. 歌詞データなし
  if (!lyricsData || (!lyricsData.syncedLyrics.length && !lyricsData.plainLyrics && !lyricsData.isInstrumental)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 text-center p-6 sm:p-8 bg-neutral-900/20 rounded-3xl border border-white/5 backdrop-blur-xl">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 sm:mb-4 text-neutral-500">
          <Mic2 className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">歌詞が見つかりませんでした</h3>
        <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
          LRCLIBにまだ登録されていない可能性があります。楽曲を再生すると自動的に再検索されます。
        </p>
      </div>
    );
  }

  // 3. インストゥルメンタル曲
  if (lyricsData.isInstrumental) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 text-center p-6 sm:p-8 bg-neutral-900/20 rounded-3xl border border-white/5 backdrop-blur-xl">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-spotify-green/10 text-spotify-green flex items-center justify-center mb-3 sm:mb-5 border border-spotify-green/20"
        >
          <Radio className="w-7 h-7 sm:w-10 sm:h-10" />
        </motion.div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">インストゥルメンタル</h3>
        <p className="text-xs sm:text-sm text-neutral-400">この楽曲には歌詞がありません（演奏曲）</p>
      </div>
    );
  }

  // 4. プレーンテキスト歌詞（同期なし）
  if (lyricsData.syncedLyrics.length === 0 && lyricsData.plainLyrics) {
    return (
      <div className="relative h-full min-h-0 flex flex-col bg-neutral-900/20 rounded-3xl border border-white/5 backdrop-blur-xl p-4 sm:p-6 md:p-8 overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 mb-3 pb-2 border-b border-white/10">
          <AlignLeft className="w-4 h-4" />
          <span>通常歌詞（タイムコード同期なし）</span>
        </div>
        <div className="overflow-y-auto flex-1 pr-2 space-y-4 text-neutral-200 text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-line font-medium selection:bg-spotify-green/30">
          {lyricsData.plainLyrics}
        </div>
      </div>
    );
  }

  // 5. 同期歌詞（Synced Lyrics）
  return (
    <div className="relative h-full min-h-0 flex flex-col overflow-hidden group">
      {/* 上下フェードグラデーションマスク */}
      <div className="absolute top-0 left-0 right-0 h-10 sm:h-16 md:h-20 landscape:max-md:h-8 bg-gradient-to-b from-[#121212] via-[#121212]/80 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-10 sm:h-16 md:h-20 landscape:max-md:h-8 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent pointer-events-none z-10" />

      {/* スクロール領域 */}
      <div
        ref={containerRef}
        className={`overflow-y-auto h-full px-3 sm:px-6 md:px-8 landscape:max-md:px-2 space-y-4 sm:space-y-6 md:space-y-8 landscape:max-md:space-y-2.5 scrollbar-none select-none scroll-smooth ${
          isLyricsMode
            ? 'py-16 sm:py-24 md:py-36 landscape:max-md:py-6 max-w-4xl mx-auto'
            : 'py-10 sm:py-20 md:py-32 landscape:max-md:py-6'
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {lyricsData.syncedLyrics.map((line, index) => {
          const isActive = index === activeLineIndex;
          const isPassed = index < activeLineIndex;

          return (
            <div
              key={`${line.id}-${line.timeMs}`}
              ref={(el) => {
                lineRefs.current[index] = el;
              }}
              onClick={() => onSeek(line.timeMs)}
              className="cursor-pointer transition-all duration-300 origin-left py-1 sm:py-2 px-2 sm:px-3 landscape:max-md:py-0.5 landscape:max-md:px-1.5 rounded-2xl hover:bg-white/5"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.04 : 1,
                  opacity: isActive ? 1 : isPassed ? 0.35 : 0.22,
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={
                  isLyricsMode
                    ? isActive
                      ? 'text-white font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl landscape:max-md:text-lg tracking-tight leading-snug drop-shadow-[0_4px_24px_rgba(255,255,255,0.4)]'
                      : 'text-neutral-400 font-extrabold text-lg sm:text-2xl md:text-3xl lg:text-4xl landscape:max-md:text-sm tracking-tight leading-snug hover:text-neutral-200'
                    : isActive
                    ? 'text-white font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl landscape:max-md:text-base tracking-tight leading-snug drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)]'
                    : 'text-neutral-400 font-bold text-sm sm:text-xl md:text-2xl lg:text-3xl landscape:max-md:text-xs tracking-tight leading-snug hover:text-neutral-200'
                }
              >
                {line.text || '•••'}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ユーザー手動スクロール時の「現在位置に戻る」フローティングボタン */}
      {userIsScrolling && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          onClick={handleResume}
          className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-spotify-green text-black shadow-xl shadow-spotify-green/20 text-xs font-bold transition hover:brightness-110 active:scale-95"
        >
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>現在の歌詞に戻る</span>
        </motion.button>
      )}
    </div>
  );
};
