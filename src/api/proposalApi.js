import axiosClient from './axiosClient';

const proposalApi = {
  getList: () =>
    axiosClient.get('/purchase-proposals'),

  create: (data) =>
    axiosClient.post('/purchase-proposals', data),

  managerApprove: (id) =>
    axiosClient.post(`/purchase-proposals/${id}/manager-approve`),

  reject: (id, data) =>
    axiosClient.post(`/purchase-proposals/${id}/reject`, data),

  delete: (id) =>
    axiosClient.delete(`/purchase-proposals/${id}`),
};

export default proposalApi;