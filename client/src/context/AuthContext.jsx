import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryToken = urlParams.get('token');
  if (queryToken) {
    localStorage.setItem('civicpulse_token', queryToken);
  }

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    queryToken || localStorage.getItem('civicpulse_token') || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const activeToken = token || queryToken;
      if (activeToken) {
        try {
          const { data } = await API.get('/auth/me');
          if (data.success) {
            setUser(data.user);
          }
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token, queryToken]);

  const login = async (username, password) => {
    const { data } = await API.post('/auth/login', { username, password });
    if (data.success) {
      localStorage.setItem('civicpulse_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    if (data.success) {
      localStorage.setItem('civicpulse_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    }
  };

  const logout = () => {
    localStorage.removeItem('civicpulse_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.isAdmin || user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
