/**
 * PWAUpdatePrompt component - notifies users of available updates
 */
import { useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '../../utils/animation';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const updateSW = (registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      const handleUpdate = (registration) => {
        setNeedRefresh(true);

        // Listen for the waiting service worker to become active
        registration.waiting?.addEventListener('statechange', (e) => {
          if (e.target.state === 'activated') {
            window.location.reload();
          }
        });
      };

      // Register update prompt
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', () => {});
      };
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
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
  };
}

export default function PWAUpdatePrompt({ onAccept, onDismiss }) {
  const promptRef = useRef(null);

  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;

    if (!prefersReducedMotion()) {
      gsap.fromTo(
        prompt,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }

    return () => {
      gsap.killTweensOf(prompt);
    };
  }, []);

  const handleDismiss = () => {
    const prompt = promptRef.current;
    if (!prompt || prefersReducedMotion()) {
      onDismiss?.();
      return;
    }

    gsap.to(prompt, {
      opacity: 0,
      y: 20,
      scale: 0.95,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: onDismiss,
    });
  };

  const handleAccept = () => {
    const prompt = promptRef.current;
    if (!prompt || prefersReducedMotion()) {
      onAccept?.();
      return;
    }

    gsap.to(prompt, {
      opacity: 0,
      scale: 0.9,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: onAccept,
    });
  };

  return (
    <div
      ref={promptRef}
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:left-auto sm:right-4 sm:w-80"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-700">
          <RefreshIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Update available
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            A new version of ClassSwap is available. Refresh to get the latest features.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAccept}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Refresh
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="text-slate-700 dark:text-slate-300"
    >
      <path
        d="M4 10C4 13.3137 6.68629 16 10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4C8.65661 4 7.38192 4.44772 6.34315 5.17157M6.34315 5.17157L6.34315 2M6.34315 5.17157L3.51472 5.17157"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * InstallPrompt - PWA install prompt for mobile/desktop
 */
export function InstallPrompt({ onDismiss }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const promptRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      // Prevent default browser prompt
      e.preventDefault();
      // Store for later
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt || !isVisible) return;

    if (!prefersReducedMotion()) {
      gsap.fromTo(
        prompt,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }
  }, [isVisible]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted PWA install');
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    const prompt = promptRef.current;
    if (!prompt || prefersReducedMotion()) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }

    gsap.to(prompt, {
      opacity: 0,
      y: 20,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        setIsVisible(false);
        onDismiss?.();
      },
    });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={promptRef}
      className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl dark:border-emerald-800 dark:bg-emerald-900/30 sm:left-auto sm:right-4 sm:w-80"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-800">
          <DownloadIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
            Install ClassSwap
          </h3>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
            Add ClassSwap to your home screen for quick access and offline use.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-800/50"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="text-emerald-700 dark:text-emerald-300"
    >
      <path
        d="M10 12V4M10 12L6 8M10 12L14 8M4 16H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
