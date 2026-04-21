import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';

const COLLEGE_STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const AUDIT_ACTION_OPTIONS = [
  { label: 'All actions', value: 'all' },
  { label: 'College approved', value: 'college_approved' },
  { label: 'College rejected', value: 'college_rejected' },
  { label: 'College activated', value: 'college_activated' },
  { label: 'College disabled', value: 'college_disabled' },
];

const prettyAuditAction = (action) => {
  switch (action) {
    case 'college_approved':
      return 'Approved';
    case 'college_rejected':
      return 'Rejected';
    case 'college_activated':
      return 'Activated';
    case 'college_disabled':
      return 'Disabled';
    default:
      return action;
  }
};

function GlobalAdminPanel() {
  const { user, logout } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [collegesPagination, setCollegesPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [collegeStatusFilter, setCollegeStatusFilter] = useState('pending');
  const [collegeSearch, setCollegeSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [collegeNoteDraft, setCollegeNoteDraft] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingColleges, setIsRefreshingColleges] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [isRefreshingAuditLogs, setIsRefreshingAuditLogs] = useState(false);
  const [actingCollegeId, setActingCollegeId] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOverview = useCallback(async () => {
    const response = await adminApi.getOverview();
    setMetrics(response?.data?.metrics || null);
  }, []);

  const loadColleges = useCallback(async () => {
    const response = await adminApi.listColleges({
      status: collegeStatusFilter,
      search: collegeSearch,
      page: collegesPagination.page,
      limit: collegesPagination.limit,
    });

    const payload = response?.data || {};
    setColleges(payload.items || []);
    setCollegesPagination((previous) => ({
      ...previous,
      ...(payload.pagination || {}),
    }));
  }, [collegeStatusFilter, collegeSearch, collegesPagination.page, collegesPagination.limit]);

  const loadUsers = useCallback(async () => {
    const response = await adminApi.listUsers({
      search: userSearch,
      page: 1,
      limit: 20,
    });

    setUsers(response?.data?.items || []);
  }, [userSearch]);

  const loadAuditLogs = useCallback(async () => {
    const response = await adminApi.listAuditLogs({
      action: auditActionFilter,
      search: auditSearch,
      page: auditPagination.page,
      limit: auditPagination.limit,
    });

    const payload = response?.data || {};
    setAuditLogs(payload.items || []);
    setAuditPagination((previous) => ({
      ...previous,
      ...(payload.pagination || {}),
    }));
  }, [auditActionFilter, auditSearch, auditPagination.page, auditPagination.limit]);

  const refreshAll = useCallback(async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await Promise.all([loadOverview(), loadColleges(), loadUsers(), loadAuditLogs()]);
    } catch (err) {
      setError(err.message || 'Failed to load admin panel data');
    } finally {
      setIsLoading(false);
    }
  }, [loadOverview, loadColleges, loadUsers, loadAuditLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const refreshColleges = async () => {
      if (isLoading) {
        return;
      }

      setIsRefreshingColleges(true);
      setError('');

      try {
        await loadColleges();
      } catch (err) {
        setError(err.message || 'Failed to refresh colleges');
      } finally {
        setIsRefreshingColleges(false);
      }
    };

    refreshColleges();
  }, [collegeStatusFilter, collegeSearch, collegesPagination.page, isLoading, loadColleges]);

  useEffect(() => {
    const refreshUsers = async () => {
      if (isLoading) {
        return;
      }

      setIsRefreshingUsers(true);
      setError('');

      try {
        await loadUsers();
      } catch (err) {
        setError(err.message || 'Failed to refresh users');
      } finally {
        setIsRefreshingUsers(false);
      }
    };

    refreshUsers();
  }, [userSearch, isLoading, loadUsers]);

  useEffect(() => {
    const refreshAuditLogs = async () => {
      if (isLoading) {
        return;
      }

      setIsRefreshingAuditLogs(true);
      setError('');

      try {
        await loadAuditLogs();
      } catch (err) {
        setError(err.message || 'Failed to refresh audit logs');
      } finally {
        setIsRefreshingAuditLogs(false);
      }
    };

    refreshAuditLogs();
  }, [auditActionFilter, auditSearch, auditPagination.page, isLoading, loadAuditLogs]);

  const pendingColleges = useMemo(
    () => colleges.filter((college) => college.verificationStatus === 'pending'),
    [colleges]
  );

  const actOnCollege = async (collegeId, action) => {
    const note = String(collegeNoteDraft[collegeId] || '').trim();

    setActingCollegeId(collegeId);
    setError('');
    setSuccess('');

    try {
      await adminApi.verifyCollege(collegeId, { action, note });
      setSuccess(`College ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      await Promise.all([loadOverview(), loadColleges(), loadAuditLogs()]);
    } catch (err) {
      setError(err.message || 'Failed to update college verification');
    } finally {
      setActingCollegeId('');
    }
  };

  const toggleCollegeActive = async (collegeId, currentState) => {
    setActingCollegeId(collegeId);
    setError('');
    setSuccess('');

    try {
      await adminApi.setCollegeActive(collegeId, !currentState);
      setSuccess(`College has been ${currentState ? 'disabled' : 'activated'}.`);
      await Promise.all([loadColleges(), loadAuditLogs()]);
    } catch (err) {
      setError(err.message || 'Failed to update college active status');
    } finally {
      setActingCollegeId('');
    }
  };

  return (
    <div className="dashboard-shell min-h-screen text-[var(--eq-text)]">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="dashboard-panel mb-6 rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="section-kicker">Global admin console</p>
              <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[var(--eq-text)] sm:text-5xl">
                Verify colleges and manage platform integrity.
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--eq-muted)] sm:text-base">
                Approve real institutions, reject spam entries, monitor users, and keep the shared registry clean.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                Signed in as {user?.fullName || user?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="app-button-secondary" onClick={refreshAll}>
                Refresh all
              </button>
              <button type="button" className="app-button-secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-[1.3rem] border border-[rgba(154,68,80,0.2)] bg-[rgba(154,68,80,0.08)] px-4 py-3 text-sm text-[var(--eq-danger)]">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-[1.3rem] border border-[rgba(47,114,95,0.2)] bg-[rgba(47,114,95,0.08)] px-4 py-3 text-sm text-[var(--eq-success)]">
            {success}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-5">
          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Pending</p>
            <p className="metric-value mt-3 text-4xl text-[var(--eq-warning)]">{metrics?.pendingColleges || 0}</p>
          </article>
          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Approved</p>
            <p className="metric-value mt-3 text-4xl text-[var(--eq-success)]">{metrics?.approvedColleges || 0}</p>
          </article>
          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Rejected</p>
            <p className="metric-value mt-3 text-4xl text-[var(--eq-danger)]">{metrics?.rejectedColleges || 0}</p>
          </article>
          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Users</p>
            <p className="metric-value mt-3 text-4xl text-[var(--eq-accent)]">{metrics?.totalUsers || 0}</p>
          </article>
          <article className="dashboard-panel rounded-[1.7rem] p-5">
            <p className="section-kicker">Global admins</p>
            <p className="metric-value mt-3 text-4xl text-[var(--eq-accent)]">{metrics?.globalAdmins || 0}</p>
          </article>
        </section>

        <section className="dashboard-panel mb-6 rounded-[1.8rem] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">College verification queue</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">Pending and moderated colleges</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={collegeStatusFilter}
                onChange={(event) => {
                  setCollegesPagination((previous) => ({ ...previous, page: 1 }));
                  setCollegeStatusFilter(event.target.value);
                }}
                className="app-select"
              >
                {COLLEGE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={collegeSearch}
                onChange={(event) => {
                  setCollegesPagination((previous) => ({ ...previous, page: 1 }));
                  setCollegeSearch(event.target.value);
                }}
                placeholder="Search by name or code"
                className="app-input"
              />
            </div>
          </div>

          {isLoading || isRefreshingColleges ? (
            <p className="text-sm text-[var(--eq-muted)]">Loading colleges...</p>
          ) : colleges.length === 0 ? (
            <p className="text-sm text-[var(--eq-muted)]">No colleges found for this filter.</p>
          ) : (
            <div className="space-y-3">
              {colleges.map((college) => (
                <article key={college.id} className="app-panel-soft rounded-[1.35rem] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--eq-text)]">{college.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--eq-muted)]">{college.code}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--eq-muted-strong)]">
                        {college.verificationStatus}
                      </span>
                      <span className="rounded-full border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--eq-muted-strong)]">
                        {college.isActive ? 'active' : 'inactive'}
                      </span>
                    </div>
                  </div>

                  {college.verificationNote && (
                    <p className="mt-2 text-sm text-[var(--eq-muted)]">Last note: {college.verificationNote}</p>
                  )}

                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                    <textarea
                      rows={2}
                      value={collegeNoteDraft[college.id] || ''}
                      onChange={(event) =>
                        setCollegeNoteDraft((previous) => ({
                          ...previous,
                          [college.id]: event.target.value,
                        }))
                      }
                      placeholder="Add moderation note (optional)"
                      className="app-textarea"
                    />
                    <div className="flex flex-wrap items-end gap-2">
                      <button
                        type="button"
                        className="app-button-primary"
                        disabled={actingCollegeId === college.id || college.verificationStatus === 'approved'}
                        onClick={() => actOnCollege(college.id, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="app-button-danger"
                        disabled={actingCollegeId === college.id || college.verificationStatus === 'rejected'}
                        onClick={() => actOnCollege(college.id, 'reject')}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="app-button-secondary"
                        disabled={actingCollegeId === college.id}
                        onClick={() => toggleCollegeActive(college.id, college.isActive)}
                      >
                        {college.isActive ? 'Disable' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--eq-muted)]">
            <span>
              Page {collegesPagination.page} of {collegesPagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCollegesPagination((previous) => ({
                    ...previous,
                    page: Math.max(previous.page - 1, 1),
                  }))
                }
                disabled={collegesPagination.page <= 1}
                className="app-button-secondary px-4 py-2 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setCollegesPagination((previous) => ({
                    ...previous,
                    page:
                      previous.page < previous.totalPages ? previous.page + 1 : previous.page,
                  }))
                }
                disabled={collegesPagination.page >= collegesPagination.totalPages}
                className="app-button-secondary px-4 py-2 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="dashboard-panel rounded-[1.8rem] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">User monitoring</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">Recent users across colleges</h2>
            </div>
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search users"
              className="app-input"
            />
          </div>

          {isLoading || isRefreshingUsers ? (
            <p className="text-sm text-[var(--eq-muted)]">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[var(--eq-muted)]">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="table-muted-head border-b border-[var(--eq-border)] text-xs uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">College</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--eq-border)]">
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{entry.fullName}</td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{entry.email}</td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">
                        {entry.college?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{(entry.roles || []).join(', ')}</td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">
                        {entry.isActive ? 'Active' : 'Inactive'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 dashboard-panel rounded-[1.8rem] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Audit log</p>
              <h2 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">
                Who approved or rejected what and when
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={auditActionFilter}
                onChange={(event) => {
                  setAuditPagination((previous) => ({ ...previous, page: 1 }));
                  setAuditActionFilter(event.target.value);
                }}
                className="app-select"
              >
                {AUDIT_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={auditSearch}
                onChange={(event) => {
                  setAuditPagination((previous) => ({ ...previous, page: 1 }));
                  setAuditSearch(event.target.value);
                }}
                placeholder="Search actor or college"
                className="app-input"
              />
            </div>
          </div>

          {isLoading || isRefreshingAuditLogs ? (
            <p className="text-sm text-[var(--eq-muted)]">Loading audit logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-[var(--eq-muted)]">No audit events found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="table-muted-head border-b border-[var(--eq-border)] text-xs uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--eq-border)]">
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">
                        <p>{entry.actor?.fullName || 'Global Admin'}</p>
                        <p className="text-xs text-[var(--eq-muted)]">{entry.actor?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{prettyAuditAction(entry.action)}</td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{entry.targetLabel}</td>
                      <td className="px-4 py-3 text-[var(--eq-muted-strong)]">{entry.details?.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--eq-muted)]">
            <span>
              Page {auditPagination.page} of {auditPagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setAuditPagination((previous) => ({
                    ...previous,
                    page: Math.max(previous.page - 1, 1),
                  }))
                }
                disabled={auditPagination.page <= 1}
                className="app-button-secondary px-4 py-2 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setAuditPagination((previous) => ({
                    ...previous,
                    page: previous.page < previous.totalPages ? previous.page + 1 : previous.page,
                  }))
                }
                disabled={auditPagination.page >= auditPagination.totalPages}
                className="app-button-secondary px-4 py-2 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 dashboard-panel rounded-[1.8rem] p-5">
          <p className="section-kicker">Quick checks</p>
          <ul className="mt-3 space-y-1 text-sm text-[var(--eq-muted-strong)]">
            <li>Pending queue currently shows {pendingColleges.length} item(s) in this page.</li>
            <li>Rejected colleges are hidden from the public registration dropdown automatically.</li>
            <li>Only accounts with role global_admin can access this panel.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default GlobalAdminPanel;
