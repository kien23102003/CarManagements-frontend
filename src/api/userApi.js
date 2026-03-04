import axiosClient from './axiosClient';

const userApi = {
  getProfile: () =>
    axiosClient.get('/user/profile'),

  getAdminAccounts: (includeDeactivated = false) =>
    axiosClient.get('/user/admin/accounts', { params: { includeDeactivated } }),

  createAdminAccount: (payload) =>
    axiosClient.post('/user/admin/accounts', payload),

  updateAdminAccountStatus: (id, isActive) =>
    axiosClient.patch(`/user/admin/accounts/${id}/status`, { isActive }),
};

export default userApi;
