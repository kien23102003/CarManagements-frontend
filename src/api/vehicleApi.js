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

  // Image upload (single image per vehicle, replaces existing)
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/assets/vehicles/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage: (id) =>
    axiosClient.delete(`/assets/vehicles/${id}/image`),

  getImage: (id) =>
    axiosClient.get(`/assets/vehicles/${id}/image`),
};

export default vehicleApi;
