import assert from 'node:assert';

// LRCパース関数のテスト用インライン
function parseLrc(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];
  const lines = lrcString.split(/\r?\n/);
  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const parsedLines = [];
  let idCounter = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = trimmed.replace(timeRegex, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let millis = 0;
      if (match[3]) {
        if (match[3].length === 1) millis = parseInt(match[3], 10) * 100;
        else if (match[3].length === 2) millis = parseInt(match[3], 10) * 10;
        else millis = parseInt(match[3].slice(0, 3), 10);
      }
      const timeMs = minutes * 60 * 1000 + seconds * 1000 + millis;
      parsedLines.push({ id: idCounter++, timeMs, text });
    }
  }
  parsedLines.sort((a, b) => a.timeMs - b.timeMs);
  return parsedLines;
}

function formatTime(ms) {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

console.log('--- LRC パーサー & タイムフォーマッター検証 ---');

// Test 1: 標準的な [mm:ss.xx] 形式
const sample1 = `
[00:05.50] 最初の一歩
[00:10.00] 次のフレーズ
`;
const res1 = parseLrc(sample1);
assert.strictEqual(res1.length, 2);
assert.strictEqual(res1[0].timeMs, 5500);
assert.strictEqual(res1[0].text, '最初の一歩');
assert.strictEqual(res1[1].timeMs, 10000);
assert.strictEqual(res1[1].text, '次のフレーズ');
console.log('✓ Test 1 Passed: [mm:ss.xx] パース成功');

// Test 2: [mm:ss.xxx] 3桁ミリ秒形式
const sample2 = `[01:23.456] 3桁ミリ秒のテスト`;
const res2 = parseLrc(sample2);
assert.strictEqual(res2.length, 1);
assert.strictEqual(res2[0].timeMs, 83456);
assert.strictEqual(res2[0].text, '3桁ミリ秒のテスト');
console.log('✓ Test 2 Passed: [mm:ss.xxx] 3桁ミリ秒パース成功');

// Test 3: ヘッダータグ無視の確認
const sample3 = `
[ti:Title]
[ar:Artist]
[00:01.00] 本文
`;
const res3 = parseLrc(sample3);
assert.strictEqual(res3.length, 1);
assert.strictEqual(res3[0].text, '本文');
console.log('✓ Test 3 Passed: ID3/LRCメタタグスキップ成功');

// Test 4: formatTime フォーマット確認
assert.strictEqual(formatTime(0), '00:00');
assert.strictEqual(formatTime(65000), '01:05');
assert.strictEqual(formatTime(3600000), '60:00');
console.log('✓ Test 4 Passed: formatTime 出力成功');

console.log('--- 全てのユニットテストが合格しました！ ---');
