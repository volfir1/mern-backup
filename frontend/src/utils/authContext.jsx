// utils/authContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, TokenManager } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth...');
      const token = TokenManager.getToken();
      const savedUser = TokenManager.getUser();
      console.log('Initial auth state:', { token: !!token, savedUser });

      if (token && savedUser) {
        const response = await authApi.checkAuth();
        if (response.success) {
          console.log('Auth check successful:', response);
          setUser(savedUser);
          setIsAuthenticated(true);
        } else {
          console.log('Auth check failed, clearing auth');
          TokenManager.clearAuth();
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      TokenManager.clearAuth();
    } finally {
      setLoading(false);
    }
  };

  const updateAuthState = async () => {
    try {
      const response = await authApi.checkAuth();
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        TokenManager.setUser(response.user);
      }
    } catch (err) {
      console.error('Auth state update error:', err);
      setUser(null);
      setIsAuthenticated(false);
      TokenManager.clearAuth();
    }
  };

  const login = async (credentials) => {
    try {
      console.log('Attempting login...');
      const response = await authApi.login(credentials);
      
      if (response.success && response.token && response.user) {
        console.log('Login successful:', response);
        setUser(response.user);
        setIsAuthenticated(true);
        setError('');
        return response.user;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const googleLogin = async (credential) => {
    try {
      console.log('Attempting Google login...');
      const response = await authApi.googleLogin({
        credential,
        isRegistration: false
      });

      if (response.success && response.token && response.user) {
        console.log('Google login successful:', response);
        setUser(response.user);
        setIsAuthenticated(true);
        setError('');
        await updateAuthState();
        return response.user;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Google login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);
      setError('');
      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    setError,
    login,
    logout,
    register,
    googleLogin,
    updateAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};