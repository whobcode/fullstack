/**
 * @module AuthContext
 * This module provides an authentication context for the application.
 */
import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from './api';

/**
 * @interface User
 * @property {string} id - The user's ID.
 * @property {string} email - The user's email address.
 * @property {string} username - The user's username.
 * @property {string} [characterId] - The user's character ID.
 */
interface User {
  id: string;
  email: string;
  username: string;
  characterId?: string;
}

/**
 * @interface AuthContextType
 * @property {User | null} user - The authenticated user, or null if not authenticated.
 * @property {boolean} isAuthenticated - Whether the user is authenticated.
 * @property {(user: User) => void} login - A function to log the user in.
 * @property {() => void} logout - A function to log the user out.
 * @property {boolean} isLoading - Whether the authentication status is currently being loaded.
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * A component that provides the authentication context to its children.
 * @param {object} props - The props for the component.
 * @param {ReactNode} props.children - The children to render.
 * @returns {JSX.Element} The AuthProvider component.
 */
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

/**
 * A hook that provides access to the authentication context.
 * @returns {AuthContextType} The authentication context.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
