import axiosClient from './axiosClient';

const authApi = {
  login: (email, password, deviceInfo) =>
    axiosClient.post('/auth/login', { email, password, deviceInfo }),

  register: (data) =>
    axiosClient.post('/auth/register', data),

  logout: (refreshToken) =>
    axiosClient.post('/auth/logout', { refreshToken }),

  refresh: (refreshToken, deviceInfo) =>
    axiosClient.post('/auth/refresh', { refreshToken, deviceInfo }),

  verifyEmail: (token) =>
    axiosClient.post('/auth/verify-email', { token }),

  resendVerification: (email) =>
    axiosClient.post('/auth/resend-verification', { email }),

  getMe: () =>
    axiosClient.get('/auth/me'),
};

export default authApi;
