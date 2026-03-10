import axiosClient from './axiosClient';

const accessoryApi = {
  getAccessories: (params) => axiosClient.get('/accessories', { params }),
  getAccessoryById: (id) => axiosClient.get(`/accessories/${id}`),
  createAccessory: (data) => axiosClient.post('/accessories', data),
  updateAccessory: (id, data) => axiosClient.put(`/accessories/${id}`, data),
  importAccessoryStock: (id, data) => axiosClient.post(`/accessories/${id}/import`, data),

  issueVehicleAccessory: (data) => axiosClient.post('/vehicle-accessories/issue', data),
  returnVehicleAccessory: (id, data) => axiosClient.post(`/vehicle-accessories/${id}/return`, data),

  getVehicleAccessories: (vehicleId, activeOnly) =>
    axiosClient.get(`/vehicles/${vehicleId}/accessories`, { params: { activeOnly } }),

  getAccessoryTransactions: (params) => axiosClient.get('/accessory-transactions', { params }),
};

export default accessoryApi;
