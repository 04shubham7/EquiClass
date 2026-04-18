import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
import AuthScreen from './components/AuthScreen';
import TimetableOnboarding from './components/TimetableOnboarding';

function LoadingScreen() {
  return (
    <div className="loading-shell grid min-h-screen place-items-center px-4">
      <p className="text-sm font-medium text-slate-600">Initializing ClassSwap session...</p>
    </div>
  );
}

function AppShell() {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { isDark, toggleTheme } = useTheme();

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

  return (
    <div className="relative min-h-screen">
      <ThemeToggleButton isDark={isDark} onToggle={toggleTheme} />
      {content}
    </div>
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
      className="theme-toggle-button fixed right-4 top-4 z-60 rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

export default App
