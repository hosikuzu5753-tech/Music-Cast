import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic2, Radio, AlignLeft, RefreshCw, ChevronDown, Type, Minus, Plus, X } from 'lucide-react';
import { LyricsData, LyricFontSize } from '../types';

interface LyricViewerProps {
  lyricsData: LyricsData | null;
  activeLineIndex: number;
  isLoading: boolean;
  onSeek: (ms: number) => void;
  isLyricsMode?: boolean;
  fontSize?: LyricFontSize;
  onFontSizeChange?: (size: LyricFontSize) => void;
}

/**
 * 1〜100 のフォントサイズ値を拡大倍率 (0.5x 〜 2.0x) に変換
 * - 1: 0.5x (50%)
 * - 50: 1.0x (100%, 標準)
 * - 100: 2.0x (200%)
 */
export function getLyricFontScale(value: number): number {
  const clamped = Math.max(1, Math.min(100, isNaN(value) ? 50 : value));
  if (clamped <= 50) {
    return 0.5 + ((clamped - 1) / 49) * 0.5;
  } else {
    return 1.0 + ((clamped - 50) / 50) * 1.0;
  }
}

export const LyricViewer: React.FC<LyricViewerProps> = ({
  lyricsData,
  activeLineIndex,
  isLoading,
  onSeek,
  isLyricsMode = false,
  fontSize = 50,
  onFontSizeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isFontPopoverOpen, setIsFontPopoverOpen] = useState(false);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<any>(null);
  const isInitialMountRef = useRef(true);

  // ポップオーバー外クリック検知
  useEffect(() => {
    if (!isFontPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsFontPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFontPopoverOpen]);

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

  const fontScale = getLyricFontScale(fontSize);

  // 4. プレーンテキスト歌詞（同期なし）
  if (lyricsData.syncedLyrics.length === 0 && lyricsData.plainLyrics) {
    return (
      <div className="relative h-full min-h-0 flex flex-col bg-neutral-900/20 rounded-3xl border border-white/5 backdrop-blur-xl p-4 sm:p-6 md:p-8 overflow-hidden">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 mb-3 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4" />
            <span>通常歌詞（タイムコード同期なし）</span>
          </div>
          {onFontSizeChange && (
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setIsFontPopoverOpen(!isFontPopoverOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition active:scale-95"
                title={`文字サイズ: ${fontSize}（クリックで調整）`}
              >
                <Type className="w-3.5 h-3.5 text-spotify-green" />
                <span className="text-[11px] font-mono">{fontSize}</span>
              </button>

              {/* ポップオーバー */}
              <AnimatePresence>
                {isFontPopoverOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute top-8 right-0 z-30 w-64 bg-neutral-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl text-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                        <Type className="w-3.5 h-3.5 text-spotify-green" />
                        <span>文字サイズ: {fontSize} / 100</span>
                      </div>
                      <button
                        onClick={() => setIsFontPopoverOpen(false)}
                        className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2.5">
                      <button
                        onClick={() => onFontSizeChange(Math.max(1, fontSize - 5))}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white text-xs font-bold transition shrink-0"
                        title="-5"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={fontSize}
                        onChange={(e) => onFontSizeChange(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                        className="flex-1 accent-spotify-green cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                      />
                      <button
                        onClick={() => onFontSizeChange(Math.min(100, fontSize + 5))}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white text-xs font-bold transition shrink-0"
                        title="+5"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between gap-1 pt-2 border-t border-white/10">
                      {[
                        { val: 1, label: '最小' },
                        { val: 30, label: '小' },
                        { val: 50, label: '標準' },
                        { val: 75, label: '大' },
                        { val: 100, label: '最大' },
                      ].map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => onFontSizeChange(val)}
                          className={`px-1.5 py-1 rounded text-[10px] font-medium transition ${
                            fontSize === val
                              ? 'bg-spotify-green text-black font-bold shadow'
                              : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div
          className="overflow-y-auto flex-1 pr-2 space-y-4 text-neutral-200 leading-relaxed whitespace-pre-line font-medium selection:bg-spotify-green/30"
          style={{ fontSize: `calc(clamp(0.95rem, 1.8vw, 1.25rem) * ${fontScale})` }}
        >
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

      {/* 右上の文字サイズクイック調整ボタン & ポップオーバー */}
      {onFontSizeChange && (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30" ref={popoverRef}>
          <button
            onClick={() => setIsFontPopoverOpen(!isFontPopoverOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-lg"
            title={`文字サイズ: ${fontSize}（クリックで調整）`}
          >
            <Type className="w-3.5 h-3.5 text-spotify-green" />
            <span className="text-[11px] font-mono font-medium">{fontSize}</span>
          </button>

          {/* クイック調整ポップオーバー */}
          <AnimatePresence>
            {isFontPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute top-9 right-0 w-64 bg-neutral-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-2xl text-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                    <Type className="w-3.5 h-3.5 text-spotify-green" />
                    <span>文字サイズ: {fontSize} / 100</span>
                  </div>
                  <button
                    onClick={() => setIsFontPopoverOpen(false)}
                    className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-white/10 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2.5">
                  <button
                    onClick={() => onFontSizeChange(Math.max(1, fontSize - 5))}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white text-xs font-bold transition shrink-0"
                    title="-5"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                    className="flex-1 accent-spotify-green cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <button
                    onClick={() => onFontSizeChange(Math.min(100, fontSize + 5))}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white text-xs font-bold transition shrink-0"
                    title="+5"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {/* プリセット */}
                <div className="flex justify-between gap-1 pt-2 border-t border-white/10">
                  {[
                    { val: 1, label: '最小' },
                    { val: 30, label: '小' },
                    { val: 50, label: '標準' },
                    { val: 75, label: '大' },
                    { val: 100, label: '最大' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => onFontSizeChange(val)}
                      className={`px-1.5 py-1 rounded text-[10px] font-medium transition ${
                        fontSize === val
                          ? 'bg-spotify-green text-black font-bold shadow'
                          : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
                      ? 'text-white font-black tracking-tight leading-snug drop-shadow-[0_4px_24px_rgba(255,255,255,0.4)]'
                      : 'text-neutral-400 font-extrabold tracking-tight leading-snug hover:text-neutral-200'
                    : isActive
                    ? 'text-white font-black tracking-tight leading-snug drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)]'
                    : 'text-neutral-400 font-bold tracking-tight leading-snug hover:text-neutral-200'
                }
                style={{
                  fontSize: isLyricsMode
                    ? isActive
                      ? `calc(clamp(1.75rem, 4.5vw, 4.25rem) * ${fontScale})`
                      : `calc(clamp(1.2rem, 3.2vw, 2.75rem) * ${fontScale})`
                    : isActive
                    ? `calc(clamp(1.3rem, 2.8vw, 2.6rem) * ${fontScale})`
                    : `calc(clamp(0.95rem, 2.1vw, 1.85rem) * ${fontScale})`,
                }}
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
