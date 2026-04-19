import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

import { useAuth } from '../context/AuthContext';
import AnimatedButton from './ui/AnimatedButton';

const REGISTER_DEFAULT = {
  email: '',
  password: '',
  fullName: '',
  department: '',
  employeeCode: '',
  timezone: 'UTC',
  rememberSession: false,
};

const LOGIN_DEFAULT = {
  email: '',
  password: '',
  rememberSession: false,
};

function AuthScreen() {
  const { login, register } = useAuth();
  const pageRef = useRef(null);
  const [mode, setMode] = useState('login');
  const [registerForm, setRegisterForm] = useState(REGISTER_DEFAULT);
  const [loginForm, setLoginForm] = useState(LOGIN_DEFAULT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeForm = useMemo(() => (mode === 'login' ? loginForm : registerForm), [mode, loginForm, registerForm]);

  useEffect(() => {
    if (!pageRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from('[data-hero-animate]', {
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power2.out',
      });

      gsap.from('[data-card-animate]', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.12,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;

    if (mode === 'login') {
      setLoginForm((previous) => ({ ...previous, [name]: nextValue }));
      return;
    }

    setRegisterForm((previous) => ({ ...previous, [name]: nextValue }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(loginForm);
      } else {
        await register(registerForm);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={pageRef} className="landing-shell min-h-screen text-slate-900">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-orb landing-orb-c" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header data-hero-animate className="flex items-center justify-between gap-4 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">ClassSwap</p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              A calm, premium way to manage class swaps.
            </h1>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur md:flex">
            Built for faculty who need speed, clarity, and fairness.
          </div>
        </header>

        <main className="grid flex-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="space-y-6">
            <div data-hero-animate className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Availability, ledger, and routine in one place
            </div>

            <div className="max-w-2xl space-y-5">
              <h2 data-hero-animate className="font-serif text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Make substitutes feel organized, not improvised.
              </h2>
              <p data-hero-animate className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                ClassSwap helps faculty publish routines, request coverage, verify availability, and keep a clean
                ledger history without the usual chaos of manual coordination.
              </p>
            </div>

            <div data-hero-animate className="grid gap-3 sm:grid-cols-3">
              <div className="hero-metric rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Coverage</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">Fast</p>
                <p className="mt-1 text-sm text-slate-600">Check, request, approve in a single flow.</p>
              </div>
              <div className="hero-metric rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Routine</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">Flexible</p>
                <p className="mt-1 text-sm text-slate-600">Add periods, mark busy slots, stay accurate.</p>
              </div>
              <div className="hero-metric rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Ledger</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">Clear</p>
                <p className="mt-1 text-sm text-slate-600">Track balances without losing context.</p>
              </div>
            </div>

            <div data-hero-animate className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
              <div className="landing-card rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">Smart availability checks</p>
                <p className="mt-1 text-sm text-slate-600">
                  Date-specific timetable overrides first, then weekly routine fallback.
                </p>
              </div>
              <div className="landing-card rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">Built for busy departments</p>
                <p className="mt-1 text-sm text-slate-600">
                  Subject code and classroom are enforced when a slot is marked Busy.
                </p>
              </div>
            </div>

            <div data-hero-animate className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMode('register')}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                Sign in
              </button>
            </div>
          </section>

          <aside data-card-animate className="auth-panel relative">
            <div className="absolute -inset-3 rounded-4xl bg-linear-to-br from-sky-200/50 via-white/30 to-emerald-200/50 blur-xl" />
            <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Get started</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                  </h2>
                </div>
                <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
                  Secure access
                </div>
              </div>

              <div className="mb-5 flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mode === 'login' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
                  }`}
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    mode === 'register' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
                  }`}
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                >
                  Register
                </button>
              </div>

              <p className="mb-5 text-sm leading-6 text-slate-600">
                {mode === 'login'
                  ? 'Use your university account to open the dashboard, manage coverage, and review balances.'
                  : 'Create a profile to publish your routine, send substitute requests, and keep your ledger clean.'}
              </p>

              <form className="space-y-4" onSubmit={onSubmit}>
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                      <input
                        name="fullName"
                        value={registerForm.fullName}
                        onChange={onChange}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                        required
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                        <input
                          name="department"
                          value={registerForm.department}
                          onChange={onChange}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Employee Code</label>
                        <input
                          name="employeeCode"
                          value={registerForm.employeeCode}
                          onChange={onChange}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Timezone</label>
                      <input
                        name="timezone"
                        value={registerForm.timezone}
                        onChange={onChange}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={activeForm.email}
                    onChange={onChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={activeForm.password}
                    onChange={onChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    minLength={8}
                    required
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="rememberSession"
                    checked={activeForm.rememberSession}
                    onChange={onChange}
                  />
                  Keep me signed in for this browser session
                </label>

                {error && (
                  <div
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </div>
                )}

                <AnimatedButton
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  isError={!!error}
                  className="w-full"
                >
                  {mode === 'login' ? 'Login' : 'Register'}
                </AnimatedButton>
              </form>

              <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Track</p>
                  <p className="mt-1 text-sm text-slate-700">Requests, balances, and routine states</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Verify</p>
                  <p className="mt-1 text-sm text-slate-700">Free slots before you send a request</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Save</p>
                  <p className="mt-1 text-sm text-slate-700">A clear paper trail for every swap</p>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <section data-card-animate className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="landing-card rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">No guesswork</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The routine editor enforces busy details and supports adding/removing periods cleanly.
            </p>
          </article>
          <article className="landing-card rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">Feels fast</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Animated surfaces, clear spacing, and focused copy keep the interface readable on every screen.
            </p>
          </article>
          <article className="landing-card rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">Built for trust</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Request approval and ledger updates stay visible so the whole team can follow along.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}

export default AuthScreen;
