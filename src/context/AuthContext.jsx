import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

const read = () => {
  try {
    const token = localStorage.getItem('rs_token');
    const user = JSON.parse(localStorage.getItem('rs_user') || 'null');
    return token && user ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
};

export const homePathFor = (role) => (role === 'donor' ? '/donor' : role === 'hospital' ? '/hospital' : role === 'admin' ? '/admin' : '/');

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(read);

  const persist = useCallback((res) => {
    localStorage.setItem('rs_token', res.token);
    localStorage.setItem('rs_user', JSON.stringify(res.user));
    setAuth({ token: res.token, user: res.user });
    return res.user;
  }, []);

  const login = useCallback(async (creds) => persist(await api.login(creds)), [persist]);
  const registerDonor = useCallback(async (data) => persist(await api.registerDonor(data)), [persist]);
  const logout = useCallback(() => {
    localStorage.removeItem('rs_token');
    localStorage.removeItem('rs_user');
    setAuth({ token: null, user: null });
  }, []);

  const value = useMemo(
    () => ({ user: auth.user, token: auth.token, isAuthed: !!auth.token, login, registerDonor, logout }),
    [auth, login, registerDonor, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
