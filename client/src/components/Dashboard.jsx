import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';

import { ledgerApi, requestApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getAnimationProfile, tuneAnimation } from '../utils/animation';

const RequestSubstituteModal = lazy(() => import('./RequestSubstituteModal'));
const RoutineSection = lazy(() => import('./routine/RoutineSection'));

function RoutineSectionFallback() {
  return (
    <div className="p-5">
      <p className="section-kicker">Routine</p>
      <p className="mt-2 text-sm text-[var(--eq-muted)]">Loading routine editor...</p>
    </div>
  );
}

function ModalFallback() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-[1.5rem] border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] p-5 shadow-2xl">
        <p className="section-kicker">Preparing</p>
        <p className="mt-2 text-sm text-[var(--eq-muted)]">Loading request form...</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const dashboardRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsPagination, setTransactionsPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionRequestId, setActionRequestId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteNotice, setInviteNotice] = useState('');
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [summaryResult, incomingResult, transactionsResult] = await Promise.all([
        ledgerApi.getSummary(),
        requestApi.getIncoming({ status: 'pending' }),
        ledgerApi.getTransactions({ page: transactionsPage, limit: 10 }),
      ]);

      setSummary(summaryResult?.data || null);
      setIncomingRequests(incomingResult?.data?.items || []);
      setTransactions(transactionsResult?.data?.items || []);
      setTransactionsPagination(
        transactionsResult?.data?.pagination || {
          page: transactionsPage,
          limit: 10,
          total: 0,
        }
      );
    } catch (err) {
      setError(err.message || 'Unable to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [transactionsPage]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!dashboardRef.current) {
      return undefined;
    }

    const profile = getAnimationProfile();
    if (profile.reduced) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.from('[data-animate="hero"]', {
        y: 24,
        opacity: 0,
        ...tuneAnimation(
          {
            duration: 0.6,
            ease: 'power2.out',
          },
          profile
        ),
      });

      gsap.from('[data-animate="panel"]', {
        y: 28,
        opacity: 0,
        ...tuneAnimation(
          {
            duration: 0.6,
            stagger: 0.07,
            delay: 0.1,
            ease: 'power2.out',
          },
          profile
        ),
      });
    }, dashboardRef);

    return () => ctx.revert();
  }, []);

  const balances = useMemo(() => summary?.pairwise || [], [summary]);
  const totalTransactionPages = useMemo(() => {
    if (!transactionsPagination.total || !transactionsPagination.limit) {
      return 1;
    }
    return Math.max(Math.ceil(transactionsPagination.total / transactionsPagination.limit), 1);
  }, [transactionsPagination]);

  const inviteLink = useMemo(() => {
    const appUrl = window.location.origin;
    return `${appUrl}/register/${user?.collegeId || ''}`;
  }, [user?.collegeId]);

  const copyInviteLink = async () => {
    if (!user?.collegeId) {
      setInviteNotice('College id is unavailable for your account. Please re-login and try again.');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteNotice('Invite link copied.');
    } catch {
      setInviteNotice('Unable to copy automatically. Please copy manually.');
    }
  };

  const handleRequestAction = async (requestId, action) => {
    const previousIncomingRequests = incomingRequests;
    const optimisticIncomingRequests = previousIncomingRequests.filter((item) => item.id !== requestId);

    setActionRequestId(requestId);
    setError('');
    setActionMessage('');
    setIncomingRequests(optimisticIncomingRequests);

    try {
      if (action === 'accept') {
        await requestApi.accept(requestId);
        setActionMessage('Request accepted. Balances and transactions updated.');
      } else {
        await requestApi.decline(requestId);
        setActionMessage('Request declined. Dashboard updated.');
      }

      try {
        await loadDashboardData();
      } catch {
        // Keep optimistic row removal if status change succeeded; user can manually refresh.
        setActionMessage((previous) =>
          previous
            ? `${previous} (Auto-refresh failed. Use Refresh to sync latest totals.)`
            : 'Status updated. Auto-refresh failed; use Refresh to sync latest totals.'
        );
      }
    } catch (err) {
      setIncomingRequests(previousIncomingRequests);
      setError(err.message || 'Failed to update request status');
    } finally {
      setActionRequestId('');
    }
  };

  return (
    <div ref={dashboardRef} className="dashboard-shell min-h-screen text-[var(--eq-text)]">
      <div className="dashboard-orb dashboard-orb-1" />
      <div className="dashboard-orb dashboard-orb-2" />
      <div className="dashboard-orb dashboard-orb-3" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header data-animate="hero" className="dashboard-panel mb-6 rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="app-tag">
                <span className="h-2 w-2 rounded-full bg-[var(--eq-accent)]" />
                EquiClass workspace
              </div>
              <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.04em] text-[var(--eq-text)] sm:text-5xl">
                {user?.fullName || 'Professor'}, your department ledger is ready.
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--eq-muted)] sm:text-base">
                Review class cover balances, respond to pending requests, and keep your recurring routine accurate in
                one calm workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="app-button-primary"
              >
                New request
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviteNotice('');
                  setIsInviteModalOpen(true);
                }}
                className="app-button-secondary"
              >
                Invite colleague
              </button>
              <button
                type="button"
                onClick={logout}
                className="app-button-secondary"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="app-panel-soft rounded-[1.4rem] p-4">
              <p className="section-kicker">Department</p>
              <p className="mt-2 text-base font-semibold text-[var(--eq-text)]">
                {user?.department || 'Faculty account'}
              </p>
            </div>
            <div className="app-panel-soft rounded-[1.4rem] p-4">
              <p className="section-kicker">Pending requests</p>
              <p className="mt-2 text-base font-semibold text-[var(--eq-text)]">
                {incomingRequests.length} waiting for response
              </p>
            </div>
            <div className="app-panel-soft rounded-[1.4rem] p-4">
              <p className="section-kicker">Ledger history</p>
              <p className="mt-2 text-base font-semibold text-[var(--eq-text)]">
                {transactionsPagination.total || 0} recorded transaction{transactionsPagination.total === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-[1.3rem] border border-[rgba(154,68,80,0.2)] bg-[rgba(154,68,80,0.08)] px-4 py-3 text-sm text-[var(--eq-danger)]">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="mb-4 rounded-[1.3rem] border border-[rgba(47,114,95,0.2)] bg-[rgba(47,114,95,0.08)] px-4 py-3 text-sm text-[var(--eq-success)]">
            {actionMessage}
          </div>
        )}

        <section data-animate="panel" className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">You owe</p>
            <p className="metric-value mt-3 text-5xl text-[var(--eq-danger)]">{summary?.totals?.youOwe || 0}</p>
            <p className="mt-2 text-sm text-[var(--eq-muted)]">Total classes you still owe colleagues.</p>
          </article>

          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Owed to you</p>
            <p className="metric-value mt-3 text-5xl text-[var(--eq-success)]">{summary?.totals?.owedToYou || 0}</p>
            <p className="mt-2 text-sm text-[var(--eq-muted)]">Coverage your colleagues still owe you.</p>
          </article>

          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Net position</p>
            <p className="metric-value mt-3 text-5xl text-[var(--eq-accent)]">{summary?.totals?.net || 0}</p>
            <p className="mt-2 text-sm text-[var(--eq-muted)]">Positive means the ledger currently favors you.</p>
          </article>
        </section>

        <div className="mb-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section data-animate="panel" className="dashboard-panel rounded-[1.8rem] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Balances</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">Who owes whom right now</h2>
              </div>
              <button type="button" onClick={loadDashboardData} className="app-button-secondary px-4 py-2 text-sm">
                Refresh
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-[var(--eq-muted)]">Loading balances...</p>
            ) : balances.length === 0 ? (
              <p className="text-sm text-[var(--eq-muted)]">No ledger balances found yet.</p>
            ) : (
              <div className="space-y-3">
                {balances.map((row) => (
                  <div
                    key={row.withUser?.id || row.withUser?.fullName}
                    className="app-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--eq-text)]">
                        {row.withUser?.fullName || 'Professor'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--eq-muted)]">{row.withUser?.id}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          row.direction === 'you_owe_them' ? 'text-[var(--eq-danger)]' : 'text-[var(--eq-success)]'
                        }`}
                      >
                        {row.direction === 'you_owe_them' ? 'You owe' : 'Owes you'} {row.netUnits} class(es)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section data-animate="panel" className="dashboard-panel rounded-[1.8rem] p-5">
            <div className="mb-4">
              <p className="section-kicker">Pending requests</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">Requests waiting on your decision</h2>
            </div>

            {isLoading ? (
              <p className="text-sm text-[var(--eq-muted)]">Loading pending requests...</p>
            ) : incomingRequests.length === 0 ? (
              <p className="text-sm text-[var(--eq-muted)]">No pending requests right now.</p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="app-panel-soft rounded-[1.35rem] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--eq-text)]">
                          {request.requester?.fullName || 'Professor'} is asking for coverage
                        </p>
                        <p className="mt-1 text-xs text-[var(--eq-muted)]">
                          {request.classEvent?.date} | {request.classEvent?.startTime}-{request.classEvent?.endTime}
                        </p>
                      </div>
                      <span className="rounded-full border border-[rgba(140,106,45,0.18)] bg-[rgba(140,106,45,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--eq-warning)]">
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[var(--eq-muted-strong)]">
                      Course: {request.classEvent?.courseCode || 'N/A'}
                    </p>
                    {request.reason && (
                      <p className="mt-1 text-sm text-[var(--eq-muted)]">Reason: {request.reason}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRequestAction(request.id, 'accept')}
                        disabled={Boolean(actionRequestId) || isLoading}
                        className="app-button-primary px-4 py-2 text-sm"
                      >
                        {actionRequestId === request.id ? 'Processing...' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestAction(request.id, 'decline')}
                        disabled={Boolean(actionRequestId) || isLoading}
                        className="app-button-danger px-4 py-2 text-sm"
                      >
                        {actionRequestId === request.id ? 'Processing...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div data-animate="panel" className="dashboard-panel mb-6">
          <Suspense fallback={<RoutineSectionFallback />}>
            <RoutineSection />
          </Suspense>
        </div>

        <section data-animate="panel" className="dashboard-panel rounded-[1.8rem] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Ledger history</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">Recent transactions</h2>
            </div>
            <button type="button" onClick={loadDashboardData} className="app-button-secondary px-4 py-2 text-sm">
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-[var(--eq-muted)]">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-[var(--eq-muted)]">No transactions yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="table-muted-head border-b border-[var(--eq-border)] text-xs uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[var(--eq-border)]">
                        <td className="px-4 py-3 text-[var(--eq-muted-strong)]">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-[var(--eq-muted-strong)]">
                          {tx.classEvent?.courseCode || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                              tx.direction === 'you_owe_them'
                                ? 'border border-[rgba(154,68,80,0.18)] bg-[rgba(154,68,80,0.08)] text-[var(--eq-danger)]'
                                : 'border border-[rgba(47,114,95,0.18)] bg-[rgba(47,114,95,0.08)] text-[var(--eq-success)]'
                            }`}
                          >
                            {tx.direction === 'you_owe_them' ? 'You owe' : 'They owe you'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{tx.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[var(--eq-muted)]">
                <span>
                  Page {transactionsPagination.page} of {totalTransactionPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionsPage((previous) => Math.max(previous - 1, 1))}
                    disabled={transactionsPagination.page <= 1 || isLoading}
                    className="app-button-secondary px-4 py-2 text-xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionsPage((previous) =>
                        previous < totalTransactionPages ? previous + 1 : previous
                      )
                    }
                    disabled={transactionsPagination.page >= totalTransactionPages || isLoading}
                    className="app-button-secondary px-4 py-2 text-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Suspense fallback={isModalOpen ? <ModalFallback /> : null}>
        <RequestSubstituteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onRequestCreated={loadDashboardData}
        />
      </Suspense>

      {isInviteModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-xl rounded-[1.8rem] border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] p-6 shadow-2xl">
            <p className="section-kicker">Team growth</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--eq-text)]">Invite your colleague</h3>
            <p className="mt-2 text-sm text-[var(--eq-muted)]">
              Share this link so your colleague can register directly into your college after reconfirmation.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-[var(--eq-muted-strong)]">
                Invitation link
              </label>
              <textarea
                readOnly
                value={inviteLink}
                rows={3}
                className="app-textarea"
              />

              {inviteNotice && (
                <p className="text-sm text-[var(--eq-success)]">{inviteNotice}</p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="app-button-secondary"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  Close
                </button>
                <button type="button" className="app-button-primary" onClick={copyInviteLink}>
                  Copy invite link
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Dashboard;
