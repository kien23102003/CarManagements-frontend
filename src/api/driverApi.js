import axiosClient from './axiosClient';

const driverApi = {
  getList: (branchId) => axiosClient.get('/drivers', { params: { branchId } }),
  getById: (id) => axiosClient.get(`/drivers/${id}`),
  create: (data) => axiosClient.post('/drivers', data),
  update: (id, data) => axiosClient.put(`/drivers/${id}`, data),
  delete: (id) => axiosClient.delete(`/drivers/${id}`),
  getAvailable: (branchId) => axiosClient.get('/drivers/available', { params: { branchId } }),
  getDropdown: (branchId) => axiosClient.get('/drivers/dropdown', { params: { branchId } }),
};

export default driverApi;
