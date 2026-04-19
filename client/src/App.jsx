import { useEffect, useRef, useCallback, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import TimetableOnboarding from './components/TimetableOnboarding';
import { FullPageLoader } from './components/ui/Skeleton';
import NetworkStatus from './components/ui/NetworkStatus';
import { KeyboardShortcuts, SkipLink } from './components/ui/KeyboardShortcuts';
import { ToastContainer } from './components/ui/Toast';
import PWAUpdatePrompt, { InstallPrompt, usePWAUpdate } from './components/ui/PWAUpdatePrompt';
import { gsap } from 'gsap';
import { prefersReducedMotion, pageIn } from './utils/animation';
import { useKeyboardShortcut } from './hooks/useKeyboardNavigation';
import { useNetworkStatus } from './hooks/useNetworkStatus';

// Toast state management
let toastListeners = [];
let toastId = 0;

export function showToast(message, type = 'info', action) {
  const id = ++toastId;
  const toast = { id, message, type, action };
  toastListeners.forEach((listener) => listener([toast, ...getToasts()]));
  return id;
}

function getToasts() {
  // This is a simple getter - in real implementation, track toasts array
  return [];
}

export function dismissToast(id) {
  toastListeners.forEach((listener) =>
    listener((toasts) => toasts.filter((t) => t.id !== id))
  );
}

function LoadingScreen() {
  const contentRef = useRef(null);

  useEffect(() => {
    const content = contentRef.current;
    if (!content || prefersReducedMotion()) return;

    pageIn(content, { duration: 0.4 });
  }, []);

  return (
    <div ref={contentRef} className="loading-shell grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
          <svg
            className="h-8 w-8 animate-spin text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="60 20"
              opacity="0.5"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Initializing ClassSwap session...
        </p>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [toasts, setToasts] = useState([]);
  const contentRef = useRef(null);
  const { isOffline } = useNetworkStatus();
  const { needRefresh, closePrompt } = usePWAUpdate();
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

  // Register toast listener
  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcut([
    { key: 't', action: toggleTheme },
    { key: 'n', ctrl: true, action: () => showToast('Create new request', 'info') },
    { key: 'r', ctrl: true, action: () => window.location.reload() },
  ]);

  // Determine current view key for transitions
  const getViewKey = () => {
    if (isInitializing) return 'loading';
    if (!isAuthenticated) return 'auth';
    if (!user?.onboardingCompleted) return 'onboarding';
    return 'dashboard';
  };

  const viewKey = getViewKey();

  // Animate content changes
  useEffect(() => {
    const content = contentRef.current;
    if (!content || prefersReducedMotion()) return;

    gsap.fromTo(
      content,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', delay: 0.1 }
    );
  }, [viewKey]);

  let content = null;

  if (isInitializing) {
    content = <LoadingScreen />;
  } else if (!isAuthenticated) {
    content = <AuthScreen />;
  } else if (!user?.onboardingCompleted) {
    content = <TimetableOnboarding />;
  } else {
    content = <Dashboard />;
  }

  const handleDismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateAccept = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    closePrompt();
  };

  return (
    <>
      <SkipLink />
      <NetworkStatus />
      <div className="relative min-h-screen" id="main-content">
        <ThemeToggleButton isDark={isDark} onToggle={toggleTheme} />
        <div ref={contentRef} key={viewKey}>{content}</div>
      </div>
      <KeyboardShortcuts />
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      {needRefresh && (
        <PWAUpdatePrompt
          onAccept={handleUpdateAccept}
          onDismiss={closePrompt}
        />
      )}
      {showInstallPrompt && (
        <InstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemeToggleButton({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="theme-toggle-button fixed right-4 top-4 z-60 inline-flex items-center gap-3 rounded-full border border-slate-300 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`theme-toggle-track relative inline-flex h-6 w-11 items-center rounded-full border transition duration-500 ${
          isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-100'
        }`}
        aria-hidden="true"
      >
        <span
          className={`theme-toggle-thumb inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-500 ease-out ${
            isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      <span className="theme-toggle-copy">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

export default App
