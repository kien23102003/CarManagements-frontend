import axiosClient from './axiosClient';

const vehicleApi = {
  getList: (params) =>
    axiosClient.get('/assets/vehicles', { params }),

  getById: (id) =>
    axiosClient.get(`/assets/vehicles/${id}`),

  create: (data) =>
    axiosClient.post('/assets/vehicles', data),

  update: (id, data) =>
    axiosClient.put(`/assets/vehicles/${id}`, data),
};

export default vehicleApi;
