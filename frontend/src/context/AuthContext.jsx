import React, { createContext, useContext, useState, useEffect } from 'react';

// Define API base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (token) => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid
        setUser(null);
        localStorage.removeItem('userToken');
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for user token or admin token
    const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    fetchUser(token);
  }, []);

  const login = (userData, token, isAdmin = false) => {
    setUser(userData);
    if (isAdmin) {
      localStorage.setItem('adminToken', token);
      localStorage.setItem('userToken', token); // Also set user token
    } else {
      localStorage.setItem('userToken', token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, fetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};