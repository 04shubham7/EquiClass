let accessTokenMemory = null;

const ACCESS_TOKEN_KEY = 'classswap_access_token';

export const tokenStore = {
  getToken() {
    if (accessTokenMemory) {
      return accessTokenMemory;
    }

    const fromSession = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (fromSession) {
      accessTokenMemory = fromSession;
    }

    return accessTokenMemory;
  },

  setToken(token, persistInSession = false) {
    accessTokenMemory = token;

    if (persistInSession) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  clear() {
    accessTokenMemory = null;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};
