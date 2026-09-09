import { LyricLine } from '../types';

/**
 * LRC形式の文字列をパースし、LyricLine配列を時系列昇順で返す
 * フォーマット例: [01:23.45] 歌詞テキスト
 */
export function parseLrc(lrcString: string): LyricLine[] {
  if (!lrcString || typeof lrcString !== 'string') {
    return [];
  }

  const lines = lrcString.split(/\r?\n/);
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const parsedLines: LyricLine[] = [];
  let idCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ヘッダータグ（[ar:Artist], [ti:Title], [offset:1000] 等）をスキップ
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) {
      continue;
    }

    // タイムタグをすべて抽出
    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    // タイムタグを除いた歌詞本文
    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let millis = 0;

      if (match[3]) {
        if (match[3].length === 1) {
          millis = parseInt(match[3], 10) * 100;
        } else if (match[3].length === 2) {
          millis = parseInt(match[3], 10) * 10;
        } else {
          millis = parseInt(match[3].slice(0, 3), 10);
        }
      }

      const timeMs = minutes * 60 * 1000 + seconds * 1000 + millis;

      parsedLines.push({
        id: idCounter++,
        timeMs,
        text,
      });
    }
  }

  // 時系列順にソート
  parsedLines.sort((a, b) => a.timeMs - b.timeMs);

  // 空行連続を整理（間奏などで空行がある場合も考慮）
  return parsedLines;
}

/**
 * ミリ秒を "mm:ss" 形式にフォーマット
 */
export function formatTime(ms: number): string {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
