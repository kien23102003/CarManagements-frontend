import axiosClient from './axiosClient';

const driverTransferApi = {
  getRequests: (status) => axiosClient.get('/driver-transfers', { params: { status } }),
  getRequestById: (id) => axiosClient.get(`/driver-transfers/${id}`),
  createRequest: (data) => axiosClient.post('/driver-transfers', data),
  confirmTransfer: (id, data) => axiosClient.post(`/driver-transfers/${id}/confirm`, data),
  cancelRequest: (id) => axiosClient.put(`/driver-transfers/${id}/cancel`),
};

export default driverTransferApi;
