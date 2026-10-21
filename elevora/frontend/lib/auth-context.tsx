"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "./api";
<<<<<<< HEAD
import type { User, UserPreferencesUpdate } from "./types";
=======
import type { User, UserPreferences } from "./types";
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
<<<<<<< HEAD
  updateProfile: (data: { name?: string; preferences?: UserPreferencesUpdate }) => Promise<User>;
=======
  updateProfile: (data: { name?: string; preferences?: Partial<UserPreferences> }) => Promise<User>;
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const me = await authApi.login({ email, password });
    setUser(me);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const me = await authApi.register({ name, email, password });
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Even if the request failed (offline, expired cookie), the UI must not
      // keep showing a session the user asked to end.
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(
<<<<<<< HEAD
    async (data: { name?: string; preferences?: UserPreferencesUpdate }) => {
=======
    async (data: { name?: string; preferences?: Partial<UserPreferences> }) => {
>>>>>>> b639e0e023ad87cd0c1a7fcc7d2c906d3fa7f2b7
      const updated = await authApi.updateMe(data);
      setUser(updated);
      return updated;
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refresh, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
