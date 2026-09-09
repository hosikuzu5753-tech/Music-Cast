import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  albumImageUrl?: string;
  header: React.ReactNode;
  player: React.ReactNode;
  lyrics: React.ReactNode;
  miniPlayer?: React.ReactNode;
  isLyricsMode: boolean;
  activeMobileTab?: 'player' | 'lyrics';
  onChangeMobileTab?: (tab: 'player' | 'lyrics') => void;
}

export const Layout: React.FC<LayoutProps> = ({
  albumImageUrl,
  header,
  player,
  lyrics,
  miniPlayer,
  isLyricsMode,
}) => {
  return (
    <div
      className="relative w-full h-full h-[100dvh] overflow-hidden bg-[#121212] text-white flex flex-col select-none overscroll-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* 幻想的なアンビエント背景（アルバムアートを元にした動的ブラー） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <AnimatePresence mode="wait">
          {albumImageUrl ? (
            <motion.div
              key={albumImageUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.36 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute -inset-20 bg-cover bg-center filter blur-[110px] scale-125"
              style={{ backgroundImage: `url(${albumImageUrl})` }}
            />
          ) : (
            <div className="absolute -inset-20 bg-gradient-to-tr from-emerald-950/20 via-neutral-900 to-black filter blur-[100px]" />
          )}
        </AnimatePresence>
        {/* 暗色オーバーレイ */}
        <div className="absolute inset-0 bg-[#121212]/75 backdrop-blur-[60px]" />
      </div>

      {/* ヘッダー */}
      {header}

      {/* メイン表示領域 */}
      <main className="relative z-10 flex-1 min-h-0 overflow-hidden p-2 sm:p-4 md:p-6 flex flex-col">
        {/* ========================================================
            1. 横向き表示（Landscape: iPhone横 & iPad横）
            - 左右2カラム強制分割
            - 左: プレイヤー (iPhone横: 40%, iPad横: 42%〜45%)
            - 右: 歌詞エリア (flex-1)
            ======================================================== */}
        <div className="hidden landscape:flex flex-row items-stretch gap-3 md:gap-8 h-full w-full max-w-7xl mx-auto min-h-0 overflow-hidden">
          {/* 左カラム: プレイヤー */}
          <div className="w-[40%] max-w-[340px] md:w-[44%] md:max-w-[460px] shrink-0 h-full flex flex-col justify-center min-h-0 overflow-hidden py-1">
            {player}
          </div>

          {/* 右カラム: 歌詞ビューワー */}
          <div className="flex-1 h-full min-h-0 overflow-hidden">
            {lyrics}
          </div>
        </div>

        {/* ========================================================
            2. 縦向き表示（Portrait: iPhone縦 & iPad縦）
            ======================================================== */}
        <div className="flex landscape:hidden flex-col h-full w-full max-w-5xl mx-auto min-h-0 overflow-hidden">
          {/* --- 2A. iPad 縦向き (md:flex) : 上下2分割 --- */}
          <div className="hidden md:flex flex-col h-full w-full min-h-0 overflow-hidden gap-4">
            {/* 上部: 楽曲情報 & プレイヤー (約38〜40%) */}
            <div className="h-[40%] max-h-[420px] shrink-0 flex flex-col justify-center items-center min-h-0">
              {player}
            </div>
            {/* 下部: 歌詞エリア (約60%) */}
            <div className="flex-1 h-[60%] min-h-0 overflow-hidden">
              {lyrics}
            </div>
          </div>

          {/* --- 2B. スマホ 縦向き (md:hidden) --- */}
          <div className="flex md:hidden flex-col h-full w-full min-h-0 overflow-hidden">
            {isLyricsMode ? (
              /* 【スマホ縦 歌詞ON】
                 上部にミニマル再生バーを固定、下部（75〜80%）を歌詞エリアに割り当て */
              <div className="flex flex-col h-full w-full min-h-0 overflow-hidden">
                <div className="shrink-0 pt-1 pb-2">
                  {miniPlayer}
                </div>
                <div className="flex-1 h-full min-h-0 overflow-hidden">
                  {lyrics}
                </div>
              </div>
            ) : (
              /* 【スマホ縦 歌詞OFF】
                 画面上部に大きめのアルバムアート、下部に曲名・歌手名・再生バー・操作ボタン（PlayerCard） */
              <div className="flex-1 h-full flex flex-col justify-center items-center min-h-0 overflow-hidden px-1">
                {player}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

