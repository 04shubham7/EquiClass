import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '../lib/api';
import { tokenStore } from '../lib/tokenStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = tokenStore.getToken();
        if (!token) {
          setIsInitializing(false);
          return;
        }

        const result = await authApi.me();
        setUser(result.data.user);
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (payload) => {
    const result = await authApi.login(payload);
    const token = result?.data?.tokens?.accessToken;

    tokenStore.setToken(token, payload.rememberSession);
    setUser(result.data.user);

    return result;
  };

  const register = async (payload) => {
    const result = await authApi.register(payload);
    const token = result?.data?.tokens?.accessToken;

    tokenStore.setToken(token, payload.rememberSession);
    setUser(result.data.user);

    return result;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    const result = await authApi.me();
    setUser(result.data.user);
    return result.data.user;
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
