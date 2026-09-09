import { useState, useEffect, useCallback, useRef } from 'react';

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wakeLockRef = useRef<any>(null);
  const shouldLockRef = useRef(false);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      setErrorMessage('お使いのブラウザは Screen Wake Lock API に対応していません。');
      return false;
    }

    try {
      shouldLockRef.current = true;
      const lock = await (navigator as any).wakeLock.request('screen');
      wakeLockRef.current = lock;
      setIsActive(true);
      setErrorMessage(null);

      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        // ユーザーが明示的に解除したのではなくOSやタブ切り替えで解除された場合
        if (!shouldLockRef.current) {
          setIsActive(false);
        }
      });

      return true;
    } catch (err: any) {
      console.warn('Wake Lock request failed:', err);
      setIsActive(false);
      setErrorMessage(err.message || 'Wake Lock の取得に失敗しました。');
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    shouldLockRef.current = false;
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
      wakeLockRef.current = null;
    }
    setIsActive(false);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (isActive) {
      await releaseWakeLock();
      return false;
    } else {
      return await requestWakeLock();
    }
  }, [isActive, releaseWakeLock, requestWakeLock]);

  // タブがバックグラウンドからアクティブに戻ったときの自動再取得
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (shouldLockRef.current && document.visibilityState === 'visible') {
        if (!wakeLockRef.current) {
          await requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestWakeLock]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    errorMessage,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock,
  };
}
