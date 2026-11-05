import React, { createContext, useContext, useState, useEffect } from 'react';
import { Api, VendorUser, RegisterVendorData } from './api';
import { StorageService } from './storage';

interface AuthContextType {
  user: VendorUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  registerVendor: (data: RegisterVendorData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  registerVendor: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

import { getCachedFcmToken } from './notificationService';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      const currentUser = await Api.getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        getCachedFcmToken().then((token) => {
          if (token) Api.registerFcmToken(token).catch(() => {});
        });
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await Api.login(email, pass);
      setUser(res.user);
      if (res.user) {
        getCachedFcmToken().then((token) => {
          if (token) Api.registerFcmToken(token).catch(() => {});
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const registerVendor = async (data: RegisterVendorData) => {
    setIsLoading(true);
    try {
      const res = await Api.registerVendor(data);
      setUser(res.user);
      if (res.user) {
        getCachedFcmToken().then((token) => {
          if (token) Api.registerFcmToken(token).catch(() => {});
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await Api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        registerVendor,
        logout,
        refreshUser: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
