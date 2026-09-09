import { LyricLine, LyricsData } from '../types';
import { parseLrc } from '../utils/lrcParser';

const LRCLIB_BASE = 'https://lrclib.net/api';
const lyricsCache = new Map<string, LyricsData>();

// 日本語文字（ひらがな、カタカナ、漢字）の正規表現
const JAPANESE_CHAR_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

// アーティスト名の別名（表記揺れ・英語表記等）マッピング
const ARTIST_ALIASES: Record<string, string[]> = {
  'ヤングスキニー': ['yangskinny'],
  'yangskinny': ['ヤングスキニー'],
  'セカンドバッカー': ['second backer', 'secondbacker'],
  'second backer': ['セカンドバッカー', 'secondbacker'],
  'secondbacker': ['セカンドバッカー', 'second backer'],
  'マカロニえんぴつ': ['macaroni empitsu', 'macaroni enpitsu'],
  'クリープハイプ': ['creephyp'],
  'ヨルシカ': ['yorushika'],
  'ずっと真夜中でいいのに。': ['ZUTOMAYO', 'ずとまよ'],
  'ずとまよ': ['ずっと真夜中でいいのに。', 'ZUTOMAYO'],
};

interface LrcLibTrack {
  id: number;
  name?: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

/**
 * 括弧内の文字列（feat, remaster, live, MVなどの補足情報）を削除
 * 全角・半角の丸括弧、角括弧、隅付き括弧、波括弧等に対応
 */
export function removeBrackets(text: string): string {
  return text
    .replace(/\s*[\(\[\{（［【〔〈《][^\)\]\}）］】〕〉》]*[\)\]\}）］】〕〉》]/g, ' ')
    .trim();
}

/**
 * 曲名の正規化（クレンジング）
 * - 括弧内の文字列を除去: (...), [...], 【...】 等
 * - 記号以降のサブタイトルを除去: - Single, - Remastered, - feat. 等
 * - 前後の空白トリム
 */
export function cleanSongTitle(title: string): string {
  if (!title) return '';

  let cleaned = title;

  // 1. 括弧とその中身を全削除
  cleaned = removeBrackets(cleaned);

  // 2. 記号以降のサブタイトル・バージョン表記・feat表記を削除
  cleaned = cleaned
    // ハイフン以降の特定キーワード（- Single, - Remastered, - Live, - replica - 等）
    .replace(
      /\s*[-–—〜~]\s*(single|remaster|feat|ft|live|version|edit|instrumental|bonus|deluxe|acoustic|official|original|music video|mv|prod|replica).*$/i,
      ''
    )
    // スペースで挟まれたハイフン/ダッシュ以降（一般的なサブタイトルパターン）
    .replace(/\s+[-–—〜~]\s+.*$/, '')
    // 末尾の "feat. ..." や "ft. ..."
    .replace(/\s+(feat\.|ft\.|featuring)\s+.*$/i, '');

  // 3. 連続空白を単一スペースにして前後の不要な空白をトリム
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // クレンジングで全て消えてしまった場合は元のトリム結果をフォールバック
  return cleaned || title.trim();
}

/**
 * アーティスト名の正規化（クレンジング）
 * - 括弧内の表記（CV, 別名義等）を除去
 * - feat. 以降を除去
 */
export function cleanArtistName(artist: string): string {
  if (!artist) return '';

  let cleaned = artist;
  cleaned = removeBrackets(cleaned);
  cleaned = cleaned.replace(/\s+(feat\.|ft\.|featuring|,|&|\/).*$/i, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned || artist.trim();
}

/**
 * 文字列内に日本語（ひらがな・カタカナ・漢字）が含まれるか判定
 */
export function containsJapanese(text?: string | null): boolean {
  if (!text) return false;
  return JAPANESE_CHAR_REGEX.test(text);
}

/**
 * アーティストの検索候補（正規化名、元名、エイリアス等）を取得
 */
export function getArtistSearchTerms(artist: string): string[] {
  const cleaned = cleanArtistName(artist);
  const lowerCleaned = cleaned.toLowerCase();
  const lowerRaw = artist.trim().toLowerCase();

  const aliases =
    ARTIST_ALIASES[cleaned] ||
    ARTIST_ALIASES[lowerCleaned] ||
    ARTIST_ALIASES[artist.trim()] ||
    ARTIST_ALIASES[lowerRaw] ||
    [];

  const terms = [cleaned, artist.trim(), ...aliases];
  return Array.from(new Set(terms)).filter(Boolean);
}

/**
 * 歌詞候補のスコアリング評価
 * - 日本語が含まれる歌詞を最優先 (+1000)
 * - 同期歌詞（syncedLyrics）ありを優先 (+100)
 * - プレーン歌詞（plainLyrics）あり (+20)
 * - 再生時間の近さ（±2秒以内 +50, ±5秒以内 +30, ±10秒以内 +10）
 * - インストゥルメンタル (+5)
 */
export function scoreLyricsCandidate(item: LrcLibTrack, targetDurationSec?: number): number {
  let score = 0;
  const lyricsText = (item.syncedLyrics || '') + ' ' + (item.plainLyrics || '');
  const hasJp = containsJapanese(lyricsText);

  // 1. 日本語歌詞の優先
  if (hasJp) {
    score += 1000;
  }

  // 2. 同期歌詞の有無
  if (item.syncedLyrics) {
    score += 100;
  } else if (item.plainLyrics) {
    score += 20;
  }

  // 3. インストゥルメンタル
  if (item.instrumental) {
    score += 5;
  }

  // 4. 再生時間（duration）との一致度
  if (targetDurationSec && typeof item.duration === 'number' && item.duration > 0) {
    const diff = Math.abs(item.duration - targetDurationSec);
    if (diff <= 2) {
      score += 50;
    } else if (diff <= 5) {
      score += 30;
    } else if (diff <= 10) {
      score += 10;
    } else if (diff > 30) {
      score -= 100;
    }
  }

  return score;
}

/**
 * 候補リストから最適な歌詞トラックを選択
 */
export function selectBestLyrics(
  candidates: LrcLibTrack[],
  targetDurationSec?: number
): LrcLibTrack | null {
  if (!candidates || candidates.length === 0) return null;

  const validCandidates = candidates.filter(
    (c) => c.instrumental || !!c.syncedLyrics || !!c.plainLyrics
  );
  if (validCandidates.length === 0) return null;

  return [...validCandidates].sort((a, b) => {
    return scoreLyricsCandidate(b, targetDurationSec) - scoreLyricsCandidate(a, targetDurationSec);
  })[0];
}

/**
 * LRCLIBから同期歌詞を取得（多段階フォールバック＋日本語優先選択）
 */
export async function fetchLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  durationMs?: number
): Promise<LyricsData> {
  const cacheKey = `${artistName} - ${trackName}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey)!;
  }

  const cleanedTitle = cleanSongTitle(trackName);
  const cleanedArtist = cleanArtistName(artistName);
  const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;
  const artistCandidates = getArtistSearchTerms(artistName);

  console.log(
    `[LyricsAPI] Fetching: "${trackName}" by "${artistName}" ` +
      `(cleaned: "${cleanedTitle}" by "${cleanedArtist}", duration: ${durationSec ?? 'unknown'}s)`
  );

  let fallbackCandidate: LrcLibTrack | null = null;

  try {
    // =========================================================================
    // Step 1 (通常検索): 整形後の曲名 + アーティスト名で完全一致取得 (/api/get) を試行
    // =========================================================================
    const step1Params = new URLSearchParams({
      artist_name: cleanedArtist,
      track_name: cleanedTitle,
    });
    if (albumName) step1Params.append('album_name', albumName);
    if (durationSec) step1Params.append('duration', durationSec.toString());

    console.log(`[LyricsAPI] Step 1 (Exact match): /api/get?${step1Params.toString()}`);

    try {
      const response = await fetch(`${LRCLIB_BASE}/get?${step1Params.toString()}`);
      if (response.ok) {
        const data: LrcLibTrack = await response.json();
        const lyricsText = (data.syncedLyrics || '') + ' ' + (data.plainLyrics || '');
        const hasJp = containsJapanese(lyricsText);

        if (data.instrumental || hasJp) {
          console.log(
            `[LyricsAPI] Step 1 Success: Found ${data.instrumental ? 'instrumental' : 'Japanese'} lyrics directly.`
          );
          return processLrcResponse(cacheKey, data);
        } else {
          // 日本語文字を含まない（ローマ字または英語歌詞）
          // 日本語の歌詞が存在する可能性があるため、暫定候補として保持し Step 2 へ
          console.warn(
            `[LyricsAPI] Step 1 returned non-Japanese lyrics (id: ${data.id}). ` +
              `Retaining as fallback candidate and searching for Japanese lyrics in Step 2...`
          );
          fallbackCandidate = data;
        }
      } else {
        console.warn(`[LyricsAPI] Step 1 failed (status: ${response.status}). Proceeding to Step 2.`);
      }
    } catch (err) {
      console.warn(`[LyricsAPI] Step 1 error:`, err);
    }

    // =========================================================================
    // Step 2 (あいまい検索): LRCLIB検索エンドポイント (/api/search?track_name=...&artist_name=...)
    // =========================================================================
    console.log(
      `[LyricsAPI] Step 2 (Fuzzy search): Searching track="${cleanedTitle}" with artists:`,
      artistCandidates
    );

    for (const artistTerm of artistCandidates) {
      const searchParams = new URLSearchParams({
        track_name: cleanedTitle,
        artist_name: artistTerm,
      });

      try {
        let searchRes = await fetch(`${LRCLIB_BASE}/search?${searchParams.toString()}`);
        let searchResults: LrcLibTrack[] = searchRes.ok ? await searchRes.json() : [];

        // track_name + artist_name で0件の場合、qパラメータ（フリーワード検索）でも試す
        if (searchResults.length === 0) {
          const qParams = new URLSearchParams({ q: `${cleanedTitle} ${artistTerm}` });
          const qRes = await fetch(`${LRCLIB_BASE}/search?${qParams.toString()}`);
          if (qRes.ok) {
            searchResults = await qRes.json();
            console.log(
              `[LyricsAPI] Step 2 q-search (/api/search?${qParams.toString()}) returned ${searchResults?.length ?? 0} candidates.`
            );
          }
        } else {
          console.log(
            `[LyricsAPI] Step 2 query (/api/search?${searchParams.toString()}) returned ${searchResults.length} candidates.`
          );
        }

        if (Array.isArray(searchResults) && searchResults.length > 0) {
          const best = selectBestLyrics(searchResults, durationSec);
          if (best) {
            const bestLyrics = (best.syncedLyrics || '') + ' ' + (best.plainLyrics || '');
            if (containsJapanese(bestLyrics) || best.instrumental) {
              console.log(
                `[LyricsAPI] Step 2 Success: Selected best Japanese candidate (id: ${best.id}, track: "${best.trackName}").`
              );
              return processLrcResponse(cacheKey, best);
            }
            // 日本語ではないが既存候補よりスコアが高ければ暫定候補を更新
            if (
              !fallbackCandidate ||
              scoreLyricsCandidate(best, durationSec) >
                scoreLyricsCandidate(fallbackCandidate, durationSec)
            ) {
              fallbackCandidate = best;
            }
          }
        }
      } catch (err) {
        console.warn(`[LyricsAPI] Step 2 error for "${artistTerm}":`, err);
      }
    }

    // クレンジング前の元タイトルでも未試行の場合は一度検索してみる
    if (cleanedTitle !== trackName.trim()) {
      try {
        const rawParams = new URLSearchParams({
          track_name: trackName.trim(),
          artist_name: cleanedArtist,
        });
        const rawRes = await fetch(`${LRCLIB_BASE}/search?${rawParams.toString()}`);
        if (rawRes.ok) {
          const rawResults: LrcLibTrack[] = await rawRes.json();
          if (Array.isArray(rawResults) && rawResults.length > 0) {
            const best = selectBestLyrics(rawResults, durationSec);
            if (best) {
              const bestLyrics = (best.syncedLyrics || '') + ' ' + (best.plainLyrics || '');
              if (containsJapanese(bestLyrics) || best.instrumental) {
                console.log(
                  `[LyricsAPI] Step 2 (raw title) Success: Selected candidate (id: ${best.id}).`
                );
                return processLrcResponse(cacheKey, best);
              }
              if (!fallbackCandidate) fallbackCandidate = best;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    // =========================================================================
    // Step 3 (曲名単体検索): 曲名のみで検索し、再生時間 (duration) が数秒以内のトラックをマッチング
    // =========================================================================
    console.log(
      `[LyricsAPI] Step 3 (Track-only + Duration match): Searching track="${cleanedTitle}" (target duration: ${durationSec ?? 'unknown'}s)`
    );

    try {
      const trackParams = new URLSearchParams({ track_name: cleanedTitle });
      let trackRes = await fetch(`${LRCLIB_BASE}/search?${trackParams.toString()}`);
      let trackResults: LrcLibTrack[] = trackRes.ok ? await trackRes.json() : [];

      if (trackResults.length === 0) {
        const qParams = new URLSearchParams({ q: cleanedTitle });
        const qRes = await fetch(`${LRCLIB_BASE}/search?${qParams.toString()}`);
        if (qRes.ok) {
          trackResults = await qRes.json();
          console.log(
            `[LyricsAPI] Step 3 q-search (/api/search?${qParams.toString()}) returned ${trackResults?.length ?? 0} candidates.`
          );
        }
      } else {
        console.log(
          `[LyricsAPI] Step 3 query (/api/search?${trackParams.toString()}) returned ${trackResults.length} candidates.`
        );
      }

      if (Array.isArray(trackResults) && trackResults.length > 0) {
          // 再生時間が指定されている場合、差が数秒以内の候補をフィルタリング
          let durationMatched = trackResults;
          if (durationSec) {
            // まずは ±5秒以内
            durationMatched = trackResults.filter(
              (item) =>
                typeof item.duration === 'number' && Math.abs(item.duration - durationSec) <= 5
            );
            // 該当なしの場合は ±10秒以内まで拡大
            if (durationMatched.length === 0) {
              durationMatched = trackResults.filter(
                (item) =>
                  typeof item.duration === 'number' && Math.abs(item.duration - durationSec) <= 10
              );
            }
            console.log(
              `[LyricsAPI] Step 3 duration filter (±5-10s): ${durationMatched.length} matching candidates.`
            );
          }

          if (durationMatched.length > 0) {
            const best = selectBestLyrics(durationMatched, durationSec);
            if (best) {
              const bestLyrics = (best.syncedLyrics || '') + ' ' + (best.plainLyrics || '');
              if (containsJapanese(bestLyrics) || best.instrumental) {
                console.log(
                  `[LyricsAPI] Step 3 Success: Selected candidate by duration matching ` +
                    `(id: ${best.id}, artist: "${best.artistName}", diff: ${
                      durationSec && best.duration ? Math.abs(best.duration - durationSec) : 0
                    }s).`
                );
                return processLrcResponse(cacheKey, best);
              }
              if (
                !fallbackCandidate ||
                scoreLyricsCandidate(best, durationSec) >
                  scoreLyricsCandidate(fallbackCandidate, durationSec)
              ) {
                fallbackCandidate = best;
              }
            }
          }
        }
    } catch (err) {
      console.warn(`[LyricsAPI] Step 3 error:`, err);
    }

    // =========================================================================
    // 最終判定: 暫定候補（洋楽などの英語歌詞含む）があれば採用、なければ空
    // =========================================================================
    if (fallbackCandidate) {
      console.log(
        `[LyricsAPI] Fallback adopted: Returning candidate (id: ${fallbackCandidate.id}, synced: ${!!fallbackCandidate.syncedLyrics}).`
      );
      return processLrcResponse(cacheKey, fallbackCandidate);
    }

    console.warn(
      `[LyricsAPI] No lyrics found after all steps for "${trackName}" by "${artistName}".`
    );
    const emptyData: LyricsData = {
      syncedLyrics: [],
      isInstrumental: false,
      source: 'none',
    };
    lyricsCache.set(cacheKey, emptyData);
    return emptyData;
  } catch (error) {
    console.error('[LyricsAPI] Unexpected error in fetchLyrics:', error);
    const emptyData: LyricsData = {
      syncedLyrics: [],
      isInstrumental: false,
      source: 'none',
    };
    return emptyData;
  }
}

function processLrcResponse(cacheKey: string, data: LrcLibTrack | null | undefined): LyricsData {
  if (!data) {
    const empty: LyricsData = { syncedLyrics: [], isInstrumental: false, source: 'none' };
    lyricsCache.set(cacheKey, empty);
    return empty;
  }

  if (data.instrumental) {
    const instrumentalData: LyricsData = {
      syncedLyrics: [],
      isInstrumental: true,
      source: 'lrclib',
    };
    lyricsCache.set(cacheKey, instrumentalData);
    return instrumentalData;
  }

  const syncedLines: LyricLine[] = data.syncedLyrics ? parseLrc(data.syncedLyrics) : [];

  const result: LyricsData = {
    syncedLyrics: syncedLines,
    plainLyrics: data.plainLyrics || undefined,
    isInstrumental: false,
    source: syncedLines.length > 0 || data.plainLyrics ? 'lrclib' : 'none',
  };

  lyricsCache.set(cacheKey, result);
  return result;
}
