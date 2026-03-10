/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginUser, registerUser } from '../services/authService';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'smart-badminton-user';
const TOKEN_STORAGE_KEY = 'smart-badminton-token';

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: Number(user.id),
    name: user.fullName || user.full_name || user.username || user.email || 'Người dùng',
    username: user.username || '',
    fullName: user.fullName || user.full_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: String(user.role || 'user').toLowerCase(),
    isActive: Boolean(user.isActive ?? user.is_active ?? true)
  };
}

function getStoredAuth() {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  const rawUser = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(rawUser));
  } catch {
    return null;
  }
}

function persistAuth(user, accessToken) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
}

function clearAuthStorage() {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth());
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY));
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    let active = true;

    getCurrentUser()
      .then((profile) => {
        if (!active) {
          return;
        }

        const normalized = normalizeUser(profile);
        setUser(normalized);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
      })
      .catch(() => {
        if (!active) {
          return;
        }

        clearAuthStorage();
        setUser(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async ({ identifier, password }) => {
    setIsSubmitting(true);
    try {
      const { user: apiUser, accessToken } = await loginUser({ identifier, password });
      const normalizedUser = normalizeUser(apiUser);
      persistAuth(normalizedUser, accessToken);
      setUser(normalizedUser);
      return normalizedUser;
    } finally {
      setIsSubmitting(false);
    }
  };

  const register = async ({ username, email, phone, password }) => {
    setIsSubmitting(true);
    try {
      const { user: apiUser, accessToken } = await registerUser({ username, email, phone, password });
      const normalizedUser = normalizeUser(apiUser);
      persistAuth(normalizedUser, accessToken);
      setUser(normalizedUser);
      return normalizedUser;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    clearAuthStorage();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isSubmitting,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout
    }),
    [user, isLoading, isSubmitting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
