import { Suspense, lazy, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
const Dashboard = lazy(() => import('./components/Dashboard'));
const GlobalAdminPanel = lazy(() => import('./components/GlobalAdminPanel'));
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const TimetableOnboarding = lazy(() => import('./components/TimetableOnboarding'));
const NetworkStatus = lazy(() => import('./components/ui/NetworkStatus'));
const KeyboardShortcuts = lazy(() =>
  import('./components/ui/KeyboardShortcuts').then((module) => ({ default: module.KeyboardShortcuts }))
);
const ToastContainer = lazy(() =>
  import('./components/ui/Toast').then((module) => ({ default: module.ToastContainer }))
);
const PWAUpdatePrompt = lazy(() => import('./components/ui/PWAUpdatePrompt'));
const InstallPrompt = lazy(() =>
  import('./components/ui/PWAUpdatePrompt').then((module) => ({ default: module.InstallPrompt }))
);
const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((module) => ({ default: module.Analytics }))
);
const SpeedInsights = lazy(() =>
  import('@vercel/speed-insights/react').then((module) => ({ default: module.SpeedInsights }))
);
import SkipLink from './components/ui/SkipLink';
import { setDocumentMotionMode } from './utils/motionProfile';
import { useKeyboardShortcut } from './hooks/useKeyboardNavigation';
import { usePWAUpdate } from './hooks/usePWAUpdate';
import { showToast, subscribeToasts } from './lib/toastBus';

function LoadingScreen() {
  return (
    <div className="loading-shell grid min-h-screen place-items-center px-4">
      <div className="app-panel rounded-[2rem] px-8 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)]">
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
        <p className="section-kicker">EquiClass</p>
        <p className="mt-2 text-sm font-medium text-[var(--eq-muted)]">
          Initializing your EquiClass workspace...
        </p>
      </div>
    </div>
  );
}

function ViewFallback() {
  return (
    <div className="loading-shell grid min-h-screen place-items-center px-4">
      <div className="app-panel rounded-[2rem] px-6 py-8 text-center">
        <p className="section-kicker">Loading view</p>
        <p className="mt-2 text-sm font-medium text-[var(--eq-muted)]">Preparing your workspace...</p>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [toasts, setToasts] = useState([]);
  const [showDeferredUI, setShowDeferredUI] = useState(false);
  const { needRefresh, closePrompt } = usePWAUpdate();
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

  useEffect(() => {
    setDocumentMotionMode();
  }, []);

  // Register toast listener
  useEffect(() => {
    return subscribeToasts(setToasts);
  }, []);

  useEffect(() => {
    const onIdle = () => setShowDeferredUI(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(onIdle, { timeout: 1800 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(onIdle, 1200);
    return () => window.clearTimeout(timeoutId);
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
    if (Array.isArray(user?.roles) && user.roles.includes('global_admin')) return 'global-admin';
    if (!user?.onboardingCompleted) return 'onboarding';
    return 'dashboard';
  };

  const viewKey = getViewKey();

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated) {
      void import('./components/TimetableOnboarding');
      void import('./components/Dashboard');
      void import('./components/GlobalAdminPanel');
      return;
    }

    if (Array.isArray(user?.roles) && user.roles.includes('global_admin')) {
      return;
    }

    if (!user?.onboardingCompleted) {
      void import('./components/Dashboard');
      return;
    }

    void import('./components/RequestSubstituteModal');
    void import('./components/routine/RoutineSection');
  }, [isAuthenticated, isInitializing, user?.onboardingCompleted, user?.roles]);

  let content = null;

  if (isInitializing) {
    content = <LoadingScreen />;
  } else if (!isAuthenticated) {
    content = <AuthScreen />;
  } else if (Array.isArray(user?.roles) && user.roles.includes('global_admin')) {
    content = <GlobalAdminPanel />;
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
      <div className="relative min-h-screen" id="main-content">
        <ThemeToggleButton isDark={isDark} onToggle={toggleTheme} />
        <div key={viewKey}>
          <Suspense fallback={<ViewFallback />}>{content}</Suspense>
        </div>
      </div>
      {showDeferredUI && (
        <Suspense fallback={null}>
          <NetworkStatus />
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
        </Suspense>
      )}
    </>
  );
}

function DeferredTelemetry() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const onIdle = () => setEnabled(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(onIdle, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(onIdle, 1800);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
        <DeferredTelemetry />
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemeToggleButton({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="theme-toggle-button fixed right-4 top-4 z-60 inline-flex items-center gap-3 rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur transition hover:-translate-y-0.5"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        className={`theme-toggle-track relative inline-flex h-6 w-11 items-center rounded-full border transition duration-500 ${
          isDark ? 'border-white/10 bg-white/10' : 'border-black/10 bg-black/5'
        }`}
        aria-hidden="true"
      >
        <span
          className={`theme-toggle-thumb inline-block h-4 w-4 rounded-full bg-[var(--eq-surface-strong)] shadow-sm transition-transform duration-500 ease-out ${
            isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
      <span className="theme-toggle-copy">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}

export default App
