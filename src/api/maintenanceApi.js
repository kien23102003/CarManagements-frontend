import axiosClient from './axiosClient';

const maintenanceApi = {
  getList: (params) =>
    axiosClient.get('/maintenance-requests', { params }),

  getById: (id, includeDeleted = false) =>
    axiosClient.get(`/maintenance-requests/${id}`, { params: { includeDeleted } }),

  create: (data) =>
    axiosClient.post('/maintenance-requests', data),

  update: (id, data) =>
    axiosClient.put(`/maintenance-requests/${id}`, data),

  approve: (id, data) =>
    axiosClient.patch(`/maintenance-requests/${id}/approval`, data),

  delete: (id) =>
    axiosClient.delete(`/maintenance-requests/${id}`),
};

export default maintenanceApi;
