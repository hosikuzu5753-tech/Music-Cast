import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Sliders, KeyRound, Info, LogIn, Share2 } from 'lucide-react';
import { getStoredClientId, setStoredClientId, getRedirectUri, initiateSpotifyLogin, isAuthenticated } from '../services/spotifyAuth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offsetMs: number;
  onOffsetChange: (offset: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  offsetMs,
  onOffsetChange,
}) => {
  const [clientId, setClientId] = useState(getStoredClientId());
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const redirectUri = getRedirectUri();

  if (!isOpen) return null;

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredClientId(clientId);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#181818] border border-white/10 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-spotify-green" />
            <h2 className="text-lg font-bold">アプリ設定</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Spotify Client ID 設定 */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-200 mb-2">
            <KeyRound className="w-4 h-4 text-spotify-green" />
            Spotify Client ID
          </label>
          <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
            ご自身の Spotify Developer アプリの Client ID を入力してください。ブラウザ内（localStorage）にのみ安全に保存されます。
          </p>

          <form onSubmit={handleSaveClientId} className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={clientId}
                onChange={(e) => {
                  const val = e.target.value;
                  setClientId(val);
                  setStoredClientId(val);
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}
                placeholder="Client ID (32文字の英数字)"
                className="flex-1 px-3 py-2 bg-neutral-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-spotify-green font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-spotify-green text-black font-semibold text-sm rounded-lg hover:brightness-110 transition flex items-center gap-1.5 shrink-0"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" /> 保存済
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
            {clientId && (
              <p className="text-[11px] text-spotify-green flex items-center gap-1">
                <Check className="w-3 h-3" /> 入力と同時にブラウザに自動保存されています
              </p>
            )}
          </form>
        </div>

        {/* 2. Redirect URI 情報 */}
        <div className="mb-6 p-3 bg-neutral-900/80 rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-neutral-300">Spotify ダッシュボード用 Redirect URI:</span>
            <button
              onClick={handleCopyRedirectUri}
              className="text-xs flex items-center gap-1 text-spotify-green hover:underline"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> コピー完了
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> コピー
                </>
              )}
            </button>
          </div>
          <code className="text-xs text-neutral-400 font-mono break-all block select-all bg-black/40 p-2 rounded border border-white/5">
            {redirectUri}
          </code>
          <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
            ※ Spotify Developer Dashboard の App Settings &gt; Redirect URIs に上記URLを登録してください。
          </p>
        </div>

        {/* 3. 歌詞同期オフセット微調整 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-neutral-200">歌詞タイミング調整 (オフセット)</label>
            <span className="text-xs font-mono text-spotify-green font-semibold">
              {offsetMs > 0 ? `+${offsetMs}ms` : `${offsetMs}ms`}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            歌声と歌詞が微妙にずれる場合に調整できます（正の値で歌詞が早く進みます）。
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="-1500"
              max="1500"
              step="50"
              value={offsetMs}
              onChange={(e) => onOffsetChange(parseInt(e.target.value, 10))}
              className="w-full accent-spotify-green cursor-pointer"
            />
            <button
              onClick={() => onOffsetChange(0)}
              className="text-xs px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-neutral-300 transition shrink-0"
            >
              リセット
            </button>
          </div>
        </div>

        {/* 4. ガイド情報 */}
        <div className="p-3.5 bg-white/5 rounded-xl text-xs text-neutral-300 space-y-2 border border-white/5">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Info className="w-4 h-4 text-blue-400" />
            <span>Spotify Developer アプリの作成手順</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
            <li>
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-spotify-green inline-flex items-center gap-0.5 hover:underline"
              >
                Spotify Developer Dashboard <ExternalLink className="w-3 h-3 inline" />
              </a>
              にログイン
            </li>
            <li>「Create app」をクリックし、App nameなどを入力</li>
            <li>「Redirect URIs」に上のURLを貼り付けて「Save」</li>
            <li>作成されたアプリの「Client ID」をコピーして本画面に登録</li>
          </ol>
        </div>

        {/* 5. 他端末（スマホ・タブレット）への共有用リンク */}
        {clientId && (
          <div className="mt-5 p-3 bg-neutral-900/60 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-neutral-300">
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>スマホ等へClient ID付きURLを共有:</span>
            </div>
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}${window.location.pathname}?client_id=${encodeURIComponent(clientId)}`;
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs flex items-center gap-1 text-purple-300 hover:text-purple-200 hover:underline"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>URLをコピー</span>
            </button>
          </div>
        )}

        {/* フッター */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition"
          >
            閉じる
          </button>

          {!isAuthenticated() && clientId && (
            <button
              onClick={async () => {
                try {
                  await initiateSpotifyLogin();
                } catch (err: any) {
                  alert(err.message || 'ログイン開始に失敗しました。');
                }
              }}
              className="px-5 py-2 bg-spotify-green hover:brightness-110 text-black font-bold text-sm rounded-lg transition shadow-md shadow-spotify-green/20 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Spotify にログイン</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
