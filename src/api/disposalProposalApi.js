import axiosClient from './axiosClient';

const disposalProposalApi = {
  getList: (params) =>
    axiosClient.get('/disposal-proposals', { params }),

  getById: (id) =>
    axiosClient.get(`/disposal-proposals/${id}`),

  create: (data) =>
    axiosClient.post('/disposal-proposals', data),

  approve: (id, data) =>
    axiosClient.put(`/disposal-proposals/${id}/approve`, data),

  reject: (id, data) =>
    axiosClient.put(`/disposal-proposals/${id}/reject`, data),

  getVehicleHistory: (vehicleId) =>
    axiosClient.get(`/vehicles/${vehicleId}/disposal-proposals`),
};

export default disposalProposalApi;
