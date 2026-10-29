import React, { createContext, useContext, useState, useEffect } from 'react';
import { Admin } from '../types';
import { api, getAdminToken, setAdminToken } from '../services/api';

interface AuthContextType {
  admin: Admin | null;
  adminLoading: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  isAdminAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [adminLoading, setAdminLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAdminSession() {
      const token = getAdminToken();
      if (!token) {
        setAdminLoading(false);
        return;
      }
      try {
        const res = await api.adminMe();
        setAdmin(res.admin);
      } catch (err) {
        console.warn('[Auth] Invalid or expired admin token:', err);
        setAdminToken(null);
        setAdmin(null);
      } finally {
        setAdminLoading(false);
      }
    }
    checkAdminSession();
  }, []);

  const adminLogin = async (email: string, password: string) => {
    const res = await api.adminLogin(email, password);
    setAdmin(res.admin);
  };

  const adminLogout = async () => {
    await api.adminLogout();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        adminLoading,
        adminLogin,
        adminLogout,
        isAdminAuthenticated: !!admin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
