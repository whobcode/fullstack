import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from './api';

interface User {
  id: string;
  email: string;
  username: string;
  characterId?: string;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an active session when the app loads
    const checkSession = async () => {
      try {
        const response = await apiClient.get<{ data: User }>('/users/me');
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
        await apiClient.post('/auth/logout', {});
    } catch(e) {
        console.error("Logout failed", e)
    } finally {
        setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
