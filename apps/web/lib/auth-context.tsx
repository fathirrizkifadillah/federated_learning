'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { pullAndDecryptAccountProfile } from '@/modules/e2ee';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, passwordPlain: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, passwordPlain: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (displayName: string, bio?: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  updateProfile: async () => ({ success: false }),
  changePassword: async () => ({ success: false }),
  logout: () => {},
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const savedToken = localStorage.getItem('fedsocial_token');
        const savedUser = localStorage.getItem('fedsocial_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));

          // Verify with backend
          try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${savedToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              const payload = data.data || data;
              if (payload?.user) {
                const refreshed: AuthUser = {
                  id: payload.user.id,
                  email: payload.user.email,
                  username: payload.user.username,
                  displayName: payload.profile?.display_name || payload.user.username,
                  bio: payload.profile?.bio || null,
                  createdAt: payload.user.created_at,
                };
                setUser(refreshed);
                localStorage.setItem('fedsocial_user', JSON.stringify(refreshed));
                void pullAndDecryptAccountProfile(
                  { id: refreshed.id, email: refreshed.email },
                  savedToken
                );
              }
            } else if (res.status === 401 && savedToken !== 'demo-token-fedsocial') {
              localStorage.removeItem('fedsocial_token');
              localStorage.removeItem('fedsocial_user');
              setToken(null);
              setUser(null);
            }
          } catch (e) {
            // offline fallback keeps existing savedUser
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, passwordPlain: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordPlain }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Email atau kata sandi tidak valid.' };
      }

      const authPayload = data.data || data;
      const userObj = authPayload.user;
      const profileObj = authPayload.profile;
      const tokenStr = authPayload.token;

      if (!userObj) {
        return { success: false, error: data.message || 'Respons tidak valid dari server.' };
      }

      const loggedUser: AuthUser = {
        id: userObj.id,
        email: userObj.email,
        username: userObj.username,
        displayName: profileObj?.display_name || userObj.username,
        bio: profileObj?.bio || null,
        createdAt: userObj.created_at,
      };

      setUser(loggedUser);
      setToken(tokenStr);
      localStorage.setItem('fedsocial_token', tokenStr);
      localStorage.setItem('fedsocial_user', JSON.stringify(loggedUser));

      // Cross-device zero-knowledge E2EE account profile restore
      await pullAndDecryptAccountProfile({ id: loggedUser.id, email: loggedUser.email }, tokenStr);

      return { success: true };
    } catch (err: any) {
      // If server is offline, support instant demo credentials
      if (email === 'fathir@fedsocial.local' && passwordPlain === 'password123') {
        const demoUser: AuthUser = {
          id: 'demo-fathir-001',
          email: 'fathir@fedsocial.local',
          username: 'fathir',
          displayName: 'Fathir Rizki',
        };
        setUser(demoUser);
        setToken('demo-token-fedsocial');
        localStorage.setItem('fedsocial_token', 'demo-token-fedsocial');
        localStorage.setItem('fedsocial_user', JSON.stringify(demoUser));
        return { success: true };
      }
      return { success: false, error: 'Gagal terhubung ke server autentikasi.' };
    }
  };

  const register = async (
    email: string,
    username: string,
    passwordPlain: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password: passwordPlain }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Gagal mendaftar akun baru.' };
      }

      const authPayload = data.data || data;
      const userObj = authPayload.user;
      const profileObj = authPayload.profile;
      const tokenStr = authPayload.token;

      if (!userObj) {
        return { success: false, error: data.message || 'Pendaftaran gagal.' };
      }

      const newUser: AuthUser = {
        id: userObj.id,
        email: userObj.email,
        username: userObj.username,
        displayName: profileObj?.display_name || userObj.username,
      };

      setUser(newUser);
      setToken(tokenStr);
      localStorage.setItem('fedsocial_token', tokenStr);
      localStorage.setItem('fedsocial_user', JSON.stringify(newUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Gagal terhubung ke server.' };
    }
  };

  const updateProfile = async (
    displayName: string,
    bio?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Silakan masuk terlebih dahulu.' };

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, bio }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Gagal memperbarui profil.' };
      }

      if (user) {
        const updatedUser: AuthUser = {
          ...user,
          displayName: displayName || user.displayName,
          bio: bio !== undefined ? bio : user.bio,
        };
        setUser(updatedUser);
        localStorage.setItem('fedsocial_user', JSON.stringify(updatedUser));
      }

      return { success: true };
    } catch (err: any) {
      if (user) {
        const updatedUser: AuthUser = { ...user, displayName };
        setUser(updatedUser);
        localStorage.setItem('fedsocial_user', JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: 'Koneksi ke server gagal.' };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) return { success: false, error: 'Silakan masuk terlebih dahulu.' };

    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Gagal mengubah kata sandi.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Koneksi ke server gagal.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('fedsocial_token');
      localStorage.removeItem('fedsocial_user');
    } catch (e) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, updateProfile, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
