import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

import { ledgerApi, requestApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import RequestSubstituteModal from './RequestSubstituteModal';
import RoutineSection from './routine/RoutineSection';

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

    const ctx = gsap.context(() => {
      gsap.from('[data-animate="hero"]', {
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      });

      gsap.from('[data-animate="panel"]', {
        y: 28,
        opacity: 0,
        duration: 0.6,
        stagger: 0.07,
        delay: 0.1,
        ease: 'power2.out',
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
    <div ref={dashboardRef} className="dashboard-shell min-h-screen text-slate-900">
      <div className="dashboard-orb dashboard-orb-1" />
      <div className="dashboard-orb dashboard-orb-2" />
      <div className="dashboard-orb dashboard-orb-3" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:px-6">
        <header
          data-animate="hero"
          className="mb-6 rounded-2xl bg-linear-to-r from-slate-900 via-slate-700 to-cyan-700 p-6 text-white shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">ClassSwap Dashboard</h1>
              <p className="mt-1 text-sm text-slate-100">
                Welcome {user?.fullName || 'Professor'}{user?.department ? ` - ${user.department}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300"
              >
                Request Substitute
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-white/50 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        )}

        <section data-animate="panel" className="mb-6 grid gap-4 md:grid-cols-3">
          <article className="dashboard-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">You Owe</p>
            <p className="mt-2 text-3xl font-bold text-rose-700">{summary?.totals?.youOwe || 0}</p>
            <p className="mt-1 text-xs text-slate-500">Total classes owed to others</p>
          </article>

          <article className="dashboard-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Owed To You</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{summary?.totals?.owedToYou || 0}</p>
            <p className="mt-1 text-xs text-slate-500">Total classes others owe you</p>
          </article>

          <article className="dashboard-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Net Position</p>
            <p className="mt-2 text-3xl font-bold text-cyan-700">{summary?.totals?.net || 0}</p>
            <p className="mt-1 text-xs text-slate-500">Positive means you are net creditor</p>
          </article>
        </section>

        <section data-animate="panel" className="dashboard-panel mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Balances</h2>
            <button
              type="button"
              onClick={loadDashboardData}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading balances...</p>
          ) : balances.length === 0 ? (
            <p className="text-sm text-slate-500">No ledger balances found yet.</p>
          ) : (
            <div className="space-y-3">
              {balances.map((row) => (
                <div
                  key={row.withUser?.id || row.withUser?.fullName}
                  className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.withUser?.fullName || 'Professor'}</p>
                    <p className="text-xs text-slate-500">{row.withUser?.id}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        row.direction === 'you_owe_them' ? 'text-rose-700' : 'text-emerald-700'
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

        <div data-animate="panel" className="dashboard-panel">
          <RoutineSection />
        </div>

        <section data-animate="panel" className="dashboard-panel mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Ledger Transactions</h2>
            <button
              type="button"
              onClick={loadDashboardData}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Course</th>
                      <th className="px-3 py-2">Direction</th>
                      <th className="px-3 py-2">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{new Date(tx.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-700">{tx.classEvent?.courseCode || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              tx.direction === 'you_owe_them'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {tx.direction === 'you_owe_them' ? 'You owe' : 'They owe you'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{tx.units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Page {transactionsPagination.page} of {totalTransactionPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionsPage((previous) => Math.max(previous - 1, 1))}
                    disabled={transactionsPagination.page <= 1 || isLoading}
                    className="rounded border border-slate-300 px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
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
                    className="rounded border border-slate-300 px-2 py-1 font-semibold hover:bg-slate-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <section data-animate="panel" className="dashboard-panel rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Pending Requests To Cover Classes</h2>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading pending requests...</p>
          ) : incomingRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No pending requests right now.</p>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.requester?.fullName || 'Professor'} requests coverage
                      </p>
                      <p className="text-xs text-slate-500">
                        {request.classEvent?.date} {request.classEvent?.startTime}-{request.classEvent?.endTime}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">
                    Course: {request.classEvent?.courseCode || 'N/A'}
                  </p>
                  {request.reason && <p className="mt-1 text-sm text-slate-600">Reason: {request.reason}</p>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, 'accept')}
                      disabled={Boolean(actionRequestId) || isLoading}
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {actionRequestId === request.id ? 'Processing...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, 'decline')}
                      disabled={Boolean(actionRequestId) || isLoading}
                      className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
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

      <RequestSubstituteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRequestCreated={loadDashboardData}
      />
    </div>
  );
}

export default Dashboard;
