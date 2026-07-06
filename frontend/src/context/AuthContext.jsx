import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate on mount
  useEffect(() => {
    const token = localStorage.getItem('mms_token');
    const saved = localStorage.getItem('mms_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      authAPI.getMe()
        .then(r => { setUser(r.data.user); localStorage.setItem('mms_user', JSON.stringify(r.data.user)); })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('mms_token', data.token);
    localStorage.setItem('mms_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('mms_token');
    localStorage.removeItem('mms_user');
    setUser(null);
  };

  const updateUser = updatedUser => {
    setUser(updatedUser);
    localStorage.setItem('mms_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
