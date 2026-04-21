import { tokenStore } from './tokenStore';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export const apiRequest = async (path, options = {}) => {
  const token = tokenStore.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Request failed');
    error.status = response.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload;
};

export const authApi = {
  register(data) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login(data) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  me() {
    return apiRequest('/auth/me', {
      method: 'GET',
    });
  },
};

export const collegesApi = {
  list() {
    return apiRequest('/colleges', {
      method: 'GET',
    });
  },

  register(data) {
    return apiRequest('/colleges/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const timetableApi = {
  getMy(termId) {
    const query = new URLSearchParams({ termId: String(termId) });
    return apiRequest(`/timetables/me?${query.toString()}`, {
      method: 'GET',
    });
  },

  saveSchedule(data) {
    return apiRequest('/timetables/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  checkAvailability(data) {
    return apiRequest('/timetables/availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  checkDateOverride(data) {
    return apiRequest('/timetables/override-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const userApi = {
  list({ search = '' } = {}) {
    const query = new URLSearchParams();
    if (search) {
      query.set('search', search);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/users${suffix}`, {
      method: 'GET',
    });
  },
};

export const requestApi = {
  create(data) {
    return apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getIncoming({ status = '', termId = '' } = {}) {
    const query = new URLSearchParams();
    if (status) {
      query.set('status', status);
    }
    if (termId) {
      query.set('termId', termId);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/requests/incoming${suffix}`, {
      method: 'GET',
    });
  },

  accept(requestId, payload = {}) {
    return apiRequest(`/requests/${requestId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  decline(requestId, payload = {}) {
    return apiRequest(`/requests/${requestId}/decline`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export const ledgerApi = {
  getSummary({ termId = '' } = {}) {
    const query = new URLSearchParams();
    if (termId) {
      query.set('termId', termId);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/ledger/me/summary${suffix}`, {
      method: 'GET',
    });
  },

  getTransactions({ termId = '', page = 1, limit = 20, fromDate = '', toDate = '' } = {}) {
    const query = new URLSearchParams();
    if (termId) {
      query.set('termId', termId);
    }
    query.set('page', String(page));
    query.set('limit', String(limit));
    if (fromDate) {
      query.set('fromDate', fromDate);
    }
    if (toDate) {
      query.set('toDate', toDate);
    }

    return apiRequest(`/ledger/me/transactions?${query.toString()}`, {
      method: 'GET',
    });
  },
};

export const routineApi = {
  getMy() {
    return apiRequest('/routine/me', {
      method: 'GET',
    });
  },

  update(data) {
    return apiRequest('/routine/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  checkAvailability(data) {
    return apiRequest('/routine/check-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const adminApi = {
  getOverview() {
    return apiRequest('/admin/overview', {
      method: 'GET',
    });
  },

  listColleges({ status = 'all', search = '', page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();

    if (status) {
      query.set('status', status);
    }
    if (search) {
      query.set('search', search);
    }
    query.set('page', String(page));
    query.set('limit', String(limit));

    return apiRequest(`/admin/colleges?${query.toString()}`, {
      method: 'GET',
    });
  },

  verifyCollege(collegeId, { action, note = '' }) {
    return apiRequest(`/admin/colleges/${collegeId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ action, note }),
    });
  },

  setCollegeActive(collegeId, isActive) {
    return apiRequest(`/admin/colleges/${collegeId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  listUsers({ search = '', collegeId = '', page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();

    if (search) {
      query.set('search', search);
    }
    if (collegeId) {
      query.set('collegeId', collegeId);
    }
    query.set('page', String(page));
    query.set('limit', String(limit));

    return apiRequest(`/admin/users?${query.toString()}`, {
      method: 'GET',
    });
  },

  listAuditLogs({ action = 'all', search = '', page = 1, limit = 20 } = {}) {
    const query = new URLSearchParams();

    if (action) {
      query.set('action', action);
    }
    if (search) {
      query.set('search', search);
    }
    query.set('page', String(page));
    query.set('limit', String(limit));

    return apiRequest(`/admin/audit-logs?${query.toString()}`, {
      method: 'GET',
    });
  },
};
