import axiosClient from './axiosClient';

const distributionApi = {
  getStock: () =>
    axiosClient.get('/distribution/stock'),

  getTransfers: (params) =>
    axiosClient.get('/distribution/transfers', { params }),

  getTransferById: (id) =>
    axiosClient.get(`/distribution/transfers/${id}`),

  createTransfer: (data) =>
    axiosClient.post('/distribution/transfers', data),

  updateTransferStatus: (id, data) =>
    axiosClient.put(`/distribution/transfers/${id}/status`, data),
};

export default distributionApi;
