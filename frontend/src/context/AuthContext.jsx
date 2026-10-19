import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/** POST without the global error toast; throws an Error carrying the server's details. */
export const authRequest = async (url, body) => {
  try {
    const { data } = await api.post(url, body, { silent: true });
    return data;
  } catch (error) {
    const data = error.response?.data || {};
    const err = new Error(
      data.message || (error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Please wait a moment and try again.' : 'Something went wrong. Please try again.')
    );
    Object.assign(err, data, { status: error.response?.status });
    throw err;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const startSession = ({ token: nextToken, user: nextUser }, message) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    if (message) toast.success(message);
    return nextUser;
  };

  /**
   * Password login. Resolves with the user, or with { otpRequired, mfaToken, maskedEmail }
   * when 2-step verification is on. Throws an error with the server's message.
   */
  const login = async (email, password) => {
    const data = await authRequest('/auth/login', { email, password });
    if (data.otpRequired) return data;
    return startSession(data, `Welcome back, ${data.user.name?.split(' ')[0] || ''}!`);
  };

  // Second step of 2-step login
  const verifyLoginOtp = async (mfaToken, otp) => {
    const data = await authRequest('/auth/login/verify', { mfaToken, otp });
    return startSession(data, `Welcome back, ${data.user.name?.split(' ')[0] || ''}!`);
  };

  // Passwordless login with an email code
  const loginWithOtp = async (email, otp) => {
    const data = await authRequest('/auth/login-otp', { email, otp });
    return startSession(data, `Welcome back, ${data.user.name?.split(' ')[0] || ''}!`);
  };

  // Registration (userData must include the email verification code as "otp")
  const register = async (userData) => {
    const data = await authRequest('/auth/register', userData);
    return startSession(data, 'Account created - your email is verified ✓');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      verifyLoginOtp,
      loginWithOtp,
      register,
      logout,
      updateUser,
      isAuthenticated: !!user
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
