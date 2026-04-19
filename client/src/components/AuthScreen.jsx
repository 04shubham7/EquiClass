import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

import { useAuth } from '../context/AuthContext';
import { collegesApi } from '../lib/api';
import { getAnimationProfile, tuneAnimation } from '../utils/animation';
import AnimatedButton from './ui/AnimatedButton';

const REGISTER_DEFAULT = {
  email: '',
  password: '',
  fullName: '',
  department: '',
  employeeCode: '',
  timezone: 'Asia/Kolkata',
  collegeId: '',
  rememberSession: false,
};

const LOGIN_DEFAULT = {
  email: '',
  password: '',
  collegeId: '',
  rememberSession: false,
};

const TIMEZONE_OPTIONS = [
  { label: 'IST (Asia/Kolkata) - UTC+05:30', value: 'Asia/Kolkata' },
  { label: 'GMT (Etc/GMT) - UTC+00:00', value: 'Etc/GMT' },
  { label: 'UTC (UTC) - UTC+00:00', value: 'UTC' },
  { label: 'Europe/London - UTC+00:00/+01:00', value: 'Europe/London' },
  { label: 'America/New_York - UTC-05:00/-04:00', value: 'America/New_York' },
];

function AuthScreen() {
  const { login, register } = useAuth();
  const pageRef = useRef(null);
  const invitedCollegeIdFromPath = useMemo(() => {
    const match = window.location.pathname.match(/^\/register\/([^/]+)\/?$/i);
    if (!match?.[1]) {
      return '';
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, []);
  const [mode, setMode] = useState('login');
  const [registerForm, setRegisterForm] = useState(REGISTER_DEFAULT);
  const [loginForm, setLoginForm] = useState(LOGIN_DEFAULT);
  const [colleges, setColleges] = useState([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(true);
  const [isCollegeDialogOpen, setIsCollegeDialogOpen] = useState(false);
  const [collegeDraftName, setCollegeDraftName] = useState('');
  const [isCreatingCollege, setIsCreatingCollege] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasConfirmedInviteCollege, setHasConfirmedInviteCollege] = useState(false);
  const [error, setError] = useState('');
  const invitedCollege = useMemo(
    () => colleges.find((college) => college.id === invitedCollegeIdFromPath) || null,
    [colleges, invitedCollegeIdFromPath]
  );
  const isInviteFlow = Boolean(invitedCollegeIdFromPath);

  const activeForm = useMemo(() => (mode === 'login' ? loginForm : registerForm), [mode, loginForm, registerForm]);

  useEffect(() => {
    if (!pageRef.current) {
      return undefined;
    }

    const profile = getAnimationProfile();
    if (profile.reduced) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from('[data-hero-animate]', {
        y: 20,
        opacity: 0,
        ...tuneAnimation(
          {
            duration: 0.7,
            stagger: 0.08,
            ease: 'power2.out',
          },
          profile
        ),
      });

      gsap.from('[data-card-animate]', {
        y: 30,
        opacity: 0,
        ...tuneAnimation(
          {
            duration: 0.8,
            delay: 0.12,
            stagger: 0.08,
            ease: 'power2.out',
          },
          profile
        ),
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!isInviteFlow) {
      return;
    }

    setMode('register');
    setRegisterForm((previous) => ({
      ...previous,
      collegeId: invitedCollegeIdFromPath,
    }));
  }, [invitedCollegeIdFromPath, isInviteFlow]);

  useEffect(() => {
    let isMounted = true;

    const loadColleges = async () => {
      setIsLoadingColleges(true);

      try {
        const result = await collegesApi.list();
        const items = result?.data?.items || [];

        if (!isMounted) {
          return;
        }

        setColleges(items);

        if (items.length > 0) {
          setRegisterForm((previous) => {
            if (previous.collegeId) {
              return previous;
            }

            return {
              ...previous,
              collegeId: items[0].id,
            };
          });

          setLoginForm((previous) => {
            if (previous.collegeId) {
              return previous;
            }

            return {
              ...previous,
              collegeId: items[0].id,
            };
          });
        }

        if (isInviteFlow) {
          const hasInvitedCollege = items.some((college) => college.id === invitedCollegeIdFromPath);

          if (!hasInvitedCollege) {
            setError('This invite link is invalid or college is no longer available. Please ask your colleague for a new invite link.');
          } else {
            setRegisterForm((previous) => ({
              ...previous,
              collegeId: invitedCollegeIdFromPath,
            }));
            setError('');
          }
        }
      } catch {
        if (isMounted) {
          setColleges([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingColleges(false);
        }
      }
    };

    loadColleges();

    return () => {
      isMounted = false;
    };
  }, [invitedCollegeIdFromPath, isInviteFlow]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;

    if (mode === 'login') {
      setLoginForm((previous) => ({ ...previous, [name]: nextValue }));
      return;
    }

    setRegisterForm((previous) => ({ ...previous, [name]: nextValue }));
  };

  const handleRegisterCollege = async (event) => {
    event.preventDefault();

    const name = String(collegeDraftName || '').trim();
    if (!name) {
      setError('College/Institution name is required');
      return;
    }

    setError('');
    setIsCreatingCollege(true);

    try {
      const result = await collegesApi.register({ name });
      const createdCollege = result?.data?.college;

      const refreshed = await collegesApi.list();
      const refreshedItems = refreshed?.data?.items || [];
      setColleges(refreshedItems);

      if (createdCollege?.id) {
        setRegisterForm((previous) => ({
          ...previous,
          collegeId: createdCollege.id,
        }));

        setLoginForm((previous) => ({
          ...previous,
          collegeId: createdCollege.id,
        }));
      }

      setCollegeDraftName('');
      setIsCollegeDialogOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to register college');
    } finally {
      setIsCreatingCollege(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'register' && isInviteFlow && !hasConfirmedInviteCollege) {
      setError('Please reconfirm joining the invited college before creating your account.');
      return;
    }

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
    <div ref={pageRef} className="landing-shell min-h-screen text-[var(--eq-text)]">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-orb landing-orb-c" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header data-hero-animate className="flex items-center justify-between gap-4 pb-6">
          <div className="space-y-4">
            <div className="app-tag">
              <span className="h-2 w-2 rounded-full bg-[var(--eq-accent)]" />
              EquiClass
            </div>
            <div>
              <p className="section-kicker">Faculty coverage ledger</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[var(--eq-text)] sm:text-4xl">
                Keep every class handoff calm, fair, and accounted for.
              </h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--eq-muted)] shadow-sm md:flex">
            Minimal coordination for busy departments.
          </div>
        </header>

        <main className="grid flex-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <section className="space-y-7">
            <div data-hero-animate className="app-tag">
              <span className="h-2 w-2 rounded-full bg-[var(--eq-success)]" />
              Routine, requests, and ledger in one view
            </div>

            <div className="max-w-3xl space-y-5">
              <h2
                data-hero-animate
                className="font-serif text-5xl font-semibold tracking-[-0.04em] text-[var(--eq-text)] sm:text-6xl lg:text-7xl"
              >
                Turn timetable gaps into clean, trackable cover requests.
              </h2>
              <p data-hero-animate className="max-w-2xl text-base leading-7 text-[var(--eq-muted)] sm:text-lg">
                EquiClass helps faculty publish routines, verify availability before asking for help, and keep a
                transparent balance of who covered what.
              </p>
            </div>

            <div data-hero-animate className="grid gap-3 sm:grid-cols-3">
              <div className="hero-metric rounded-[1.7rem] p-5">
                <p className="section-kicker">Availability</p>
                <p className="metric-value mt-3 text-3xl text-[var(--eq-text)]">Verified</p>
                <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
                  Date overrides first, weekly routine fallback second.
                </p>
              </div>
              <div className="hero-metric rounded-[1.7rem] p-5">
                <p className="section-kicker">Requests</p>
                <p className="metric-value mt-3 text-3xl text-[var(--eq-text)]">Focused</p>
                <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
                  Ask the right colleague with the full context attached.
                </p>
              </div>
              <div className="hero-metric rounded-[1.7rem] p-5">
                <p className="section-kicker">Ledger</p>
                <p className="metric-value mt-3 text-3xl text-[var(--eq-text)]">Balanced</p>
                <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
                  Keep coverage history visible without chasing old messages.
                </p>
              </div>
            </div>

            <div data-hero-animate className="grid gap-3 sm:grid-cols-2">
              <article className="landing-card rounded-[1.75rem] p-5">
                <p className="section-kicker">Why it feels lighter</p>
                <p className="mt-3 text-base font-semibold text-[var(--eq-text)]">
                  Fewer steps, less guesswork, clearer accountability.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
                  Busy slots, rooms, course codes, and request timing stay aligned from the first click.
                </p>
              </article>
              <article className="landing-card rounded-[1.75rem] p-5">
                <p className="section-kicker">Built for faculty teams</p>
                <p className="mt-3 text-base font-semibold text-[var(--eq-text)]">
                  Manage substitute coverage without turning it into admin overhead.
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
                  Every request carries the timetable context you need to respond with confidence.
                </p>
              </article>
            </div>

            <div data-hero-animate className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setMode('register')} className="app-button-primary">
                Create account
              </button>
              <button type="button" onClick={() => setMode('login')} className="app-button-secondary">
                Sign in
              </button>
            </div>
          </section>

          <aside data-card-animate className="auth-panel relative rounded-[2rem] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Secure access</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--eq-text)]">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
              </div>
              <div className="rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--eq-muted)]">
                EquiClass
              </div>
            </div>

            <div className="app-toggle-group mb-5">
              <button
                type="button"
                className={`app-toggle-option ${mode === 'login' ? 'app-toggle-option-active' : ''}`}
                onClick={() => {
                  if (isInviteFlow) {
                    return;
                  }
                  setMode('login');
                  setError('');
                }}
                disabled={isInviteFlow}
              >
                Login
              </button>
              <button
                type="button"
                className={`app-toggle-option ${mode === 'register' ? 'app-toggle-option-active' : ''}`}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Register
              </button>
            </div>

            <p className="mb-5 text-sm leading-6 text-[var(--eq-muted)]">
              {mode === 'login'
                ? 'Open your workspace, respond to coverage requests, and review balances for the term.'
                : 'Set up your faculty profile so colleagues can find you, verify your routine, and request cover cleanly.'}
            </p>

            {isInviteFlow && mode === 'register' && (
              <div className="mb-5 rounded-2xl border border-[rgba(140,106,45,0.2)] bg-[rgba(140,106,45,0.08)] px-4 py-3 text-sm text-[var(--eq-warning)]">
                <p className="font-semibold">Invitation confirmation required</p>
                <p className="mt-1 text-[var(--eq-muted-strong)]">
                  You are joining: {invitedCollege?.name || 'Invited college'}
                </p>
                <button
                  type="button"
                  className="mt-3 app-button-secondary"
                  onClick={() => {
                    setHasConfirmedInviteCollege(true);
                    setError('');
                  }}
                  disabled={!invitedCollege || hasConfirmedInviteCollege}
                >
                  {hasConfirmedInviteCollege ? 'College confirmed' : 'Confirm and continue'}
                </button>
              </div>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              {mode === 'register' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Full Name</label>
                    <input
                      name="fullName"
                      value={registerForm.fullName}
                      onChange={onChange}
                      className="app-input"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">College</label>

                      <select
                        name="collegeId"
                        value={registerForm.collegeId}
                        onChange={onChange}
                        className="app-input"
                        required
                        disabled={isLoadingColleges || colleges.length === 0 || isInviteFlow}
                      >
                        {isLoadingColleges ? (
                          <option value="">Loading colleges...</option>
                        ) : colleges.length === 0 ? (
                          <option value="">No colleges found</option>
                        ) : (
                          colleges.map((college) => (
                            <option key={college.id} value={college.id}>
                              {college.name}
                            </option>
                          ))
                        )}
                      </select>

                      <button
                        type="button"
                        className="mt-2 text-sm font-semibold text-[var(--eq-accent)] underline underline-offset-2 transition hover:text-[var(--eq-accent-strong)]"
                        onClick={() => {
                          setError('');
                          setIsCollegeDialogOpen(true);
                        }}
                      >
                        College not listed? Register your college/institution
                      </button>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">
                        Department
                      </label>
                      <input
                        name="department"
                        value={registerForm.department}
                        onChange={onChange}
                        className="app-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">
                        Employee Code
                      </label>
                      <input
                        name="employeeCode"
                        value={registerForm.employeeCode}
                        onChange={onChange}
                        className="app-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Timezone</label>
                    <select
                      name="timezone"
                      value={registerForm.timezone}
                      onChange={onChange}
                      className="app-input"
                    >
                      {TIMEZONE_OPTIONS.map((timezone) => (
                        <option key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Email</label>
                <input
                  type="email"
                  name="email"
                  value={activeForm.email}
                  onChange={onChange}
                  className="app-input"
                  required
                />
              </div>

              {mode === 'login' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">College</label>
                  <select
                    name="collegeId"
                    value={loginForm.collegeId}
                    onChange={onChange}
                    className="app-input"
                    required
                    disabled={isLoadingColleges || colleges.length === 0}
                  >
                    {isLoadingColleges ? (
                      <option value="">Loading colleges...</option>
                    ) : colleges.length === 0 ? (
                      <option value="">No colleges found</option>
                    ) : (
                      colleges.map((college) => (
                        <option key={college.id} value={college.id}>
                          {college.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Password</label>
                <input
                  type="password"
                  name="password"
                  value={activeForm.password}
                  onChange={onChange}
                  className="app-input"
                  minLength={8}
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--eq-muted-strong)]">
                <input
                  type="checkbox"
                  name="rememberSession"
                  checked={activeForm.rememberSession}
                  onChange={onChange}
                  className="h-4 w-4 rounded border-[var(--eq-border)]"
                />
                Keep me signed in for this browser session
              </label>

              {error && (
                <div
                  className="rounded-2xl border border-[rgba(154,68,80,0.2)] bg-[rgba(154,68,80,0.08)] px-4 py-3 text-sm text-[var(--eq-danger)]"
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

            <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] p-4 sm:grid-cols-3">
              <div>
                <p className="section-kicker">Track</p>
                <p className="mt-2 text-sm text-[var(--eq-muted-strong)]">Requests, balances, and routine states</p>
              </div>
              <div>
                <p className="section-kicker">Verify</p>
                <p className="mt-2 text-sm text-[var(--eq-muted-strong)]">Free slots before you send a request</p>
              </div>
              <div>
                <p className="section-kicker">Save</p>
                <p className="mt-2 text-sm text-[var(--eq-muted-strong)]">A clean record for every handoff</p>
              </div>
            </div>
          </aside>
        </main>

        <section data-card-animate className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="landing-card rounded-[1.75rem] p-5">
            <p className="section-kicker">No guesswork</p>
            <p className="mt-3 text-base font-semibold text-[var(--eq-text)]">
              The routine editor enforces the details a busy slot needs.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
              The routine editor enforces busy details and supports adding/removing periods cleanly.
            </p>
          </article>
          <article className="landing-card rounded-[1.75rem] p-5">
            <p className="section-kicker">Feels focused</p>
            <p className="mt-3 text-base font-semibold text-[var(--eq-text)]">
              A quieter interface keeps the important actions close at hand.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
              Clear spacing, restrained motion, and calm surfaces make the workflow easier to scan on any screen.
            </p>
          </article>
          <article className="landing-card rounded-[1.75rem] p-5">
            <p className="section-kicker">Built for trust</p>
            <p className="mt-3 text-base font-semibold text-[var(--eq-text)]">
              Every request leaves a visible record the department can rely on.
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--eq-muted)]">
              Request approval and ledger updates stay visible so the whole team can follow along.
            </p>
          </article>
        </section>

        {isCollegeDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-[1.7rem] border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] p-6 shadow-2xl">
              <p className="section-kicker">College onboarding</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--eq-text)]">Register your college/Institution</h3>
              <p className="mt-2 text-sm text-[var(--eq-muted)]">
                Enter the institution name and EquiClass will generate a unique college code automatically.
              </p>

              <form className="mt-4 space-y-4" onSubmit={handleRegisterCollege}>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">
                    College/Institution Name
                  </label>
                  <input
                    value={collegeDraftName}
                    onChange={(event) => setCollegeDraftName(event.target.value)}
                    className="app-input"
                    placeholder="e.g. National Institute of Technology"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="app-button-secondary"
                    onClick={() => {
                      setCollegeDraftName('');
                      setIsCollegeDialogOpen(false);
                    }}
                    disabled={isCreatingCollege}
                  >
                    Cancel
                  </button>
                  <AnimatedButton type="submit" isLoading={isCreatingCollege} className="app-button-primary">
                    Register College
                  </AnimatedButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthScreen;
