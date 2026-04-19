import { useCallback, useEffect, useState } from 'react';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return undefined;
    }

    const handleControllerChange = () => {
      window.location.reload();
    };

    const watchRegistration = (registration) => {
      if (registration.waiting) {
        setNeedRefresh(true);
      }

      const handleUpdateFound = () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      };

      registration.addEventListener('updatefound', handleUpdateFound);

      return () => {
        registration.removeEventListener('updatefound', handleUpdateFound);
      };
    };

    let cleanupRegistrationListener = null;

    navigator.serviceWorker.ready.then((registration) => {
      cleanupRegistrationListener = watchRegistration(registration);
    });

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      cleanupRegistrationListener?.();
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
        setNeedRefresh(Boolean(registration.waiting));
      });
    }
  }, []);

  const closePrompt = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    closePrompt,
    setOfflineReady,
    setNeedRefresh,
  };
}
