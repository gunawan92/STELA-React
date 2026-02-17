import { useEffect, useState } from 'react';
import { showInternetOfflineAlert, showInternetOnlineAlert } from '../lib/alerts';

function getInitialStatus() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function useInternetStatus() {
  const [isOnline, setIsOnline] = useState(getInitialStatus);
  const [pingMs, setPingMs] = useState(null);

  useEffect(() => {
    if (!isOnline) {
      setPingMs(null);
      return;
    }

    let isCancelled = false;
    let intervalId;

    async function measurePing() {
      const pingUrl = import.meta.env.VITE_PING_URL || `${window.location.origin}/favicon.ico`;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3000);
      const startedAt = performance.now();

      try {
        await fetch(`${pingUrl}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          mode: 'no-cors',
          signal: controller.signal,
        });

        if (isCancelled) return;
        const endedAt = performance.now();
        setPingMs(Math.max(1, Math.round(endedAt - startedAt)));
      } catch {
        if (!isCancelled) setPingMs(null);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    measurePing();
    intervalId = window.setInterval(measurePing, 10000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isOnline]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      showInternetOnlineAlert();
    }

    function handleOffline() {
      setIsOnline(false);
      showInternetOfflineAlert();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    pingMs,
    statusLabel: isOnline ? 'Terhubung' : 'Terputus',
  };
}
