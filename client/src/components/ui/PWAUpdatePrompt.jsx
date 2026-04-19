/**
 * PWAUpdatePrompt component - notifies users of available updates
 */
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { getAnimationProfile, tuneAnimation } from '../../utils/animation';

export default function PWAUpdatePrompt({ onAccept, onDismiss }) {
  const promptRef = useRef(null);

  useEffect(() => {
    const prompt = promptRef.current;
    if (!prompt) return;

    const profile = getAnimationProfile();

    if (!profile.reduced) {
      gsap.fromTo(
        prompt,
        { opacity: 0, y: 20, scale: 0.95 },
        tuneAnimation({ opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }, profile)
      );
    }

    return () => {
      gsap.killTweensOf(prompt);
    };
  }, []);

  const handleDismiss = () => {
    const prompt = promptRef.current;
    const profile = getAnimationProfile();

    if (!prompt || profile.reduced) {
      onDismiss?.();
      return;
    }

    gsap.to(prompt, {
      opacity: 0,
      y: 20,
      scale: 0.95,
      ...tuneAnimation({ duration: 0.2, ease: 'power2.in' }, profile),
      onComplete: onDismiss,
    });
  };

  const handleAccept = () => {
    const prompt = promptRef.current;
    const profile = getAnimationProfile();

    if (!prompt || profile.reduced) {
      onAccept?.();
      return;
    }

    gsap.to(prompt, {
      opacity: 0,
      scale: 0.9,
      ...tuneAnimation({ duration: 0.2, ease: 'power2.in' }, profile),
      onComplete: onAccept,
    });
  };

  return (
    <div
      ref={promptRef}
      className="prompt-card fixed bottom-4 left-4 right-4 z-50 rounded-[1.6rem] border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] p-4 shadow-2xl sm:left-auto sm:right-4 sm:w-96"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] p-2">
          <RefreshIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--eq-text)]">EquiClass update ready</h3>
          <p className="mt-1 text-sm text-[var(--eq-muted)]">
            A newer EquiClass build is available. Refresh to get the latest workflow and interface improvements.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleAccept} className="app-button-primary px-4 py-2 text-sm">
              Refresh
            </button>
            <button onClick={handleDismiss} className="app-button-secondary px-4 py-2 text-sm">
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
      className="text-[var(--eq-muted-strong)]"
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
      e.preventDefault();
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

    const profile = getAnimationProfile();

    if (!profile.reduced) {
      gsap.fromTo(
        prompt,
        { opacity: 0, y: 20 },
        tuneAnimation({ opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.2)' }, profile)
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
    const profile = getAnimationProfile();

    if (!prompt || profile.reduced) {
      setIsVisible(false);
      onDismiss?.();
      return;
    }

    gsap.to(prompt, {
      opacity: 0,
      y: 20,
      ...tuneAnimation({ duration: 0.2, ease: 'power2.in' }, profile),
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
      className="prompt-card fixed bottom-4 left-4 right-4 z-50 rounded-[1.6rem] border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] p-4 shadow-xl sm:left-auto sm:right-4 sm:w-96"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] p-2">
          <DownloadIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--eq-text)]">Install EquiClass</h3>
          <p className="mt-1 text-sm text-[var(--eq-muted)]">
            Add EquiClass to your home screen for quick access, even when campus Wi-Fi is unreliable.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleInstall} className="app-button-primary px-4 py-2 text-sm">
              Install
            </button>
            <button onClick={handleDismiss} className="app-button-secondary px-4 py-2 text-sm">
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
      className="text-[var(--eq-muted-strong)]"
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
