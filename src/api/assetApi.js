import axiosClient from './axiosClient';

const assetApi = {
  // Get all vehicles/assets
  getList: (params) =>
    axiosClient.get('/assets/vehicles', { params }),

  // Get vehicle by ID
  getById: (id) =>
    axiosClient.get(`/assets/vehicles/${id}`),

  // Create new asset (Accountant only) - POST /api/assets/vehicles/asset-create
  createAsset: (data) =>
    axiosClient.post('/assets/vehicles/asset-create', data),

  // Assign vehicle to driver - POST /api/assets/vehicles/:id/assign
  assignVehicle: (id, data) =>
    axiosClient.post(`/assets/vehicles/${id}/assign`, data),

  // Unassign vehicle - POST /api/assets/vehicles/:id/unassign
  unassignVehicle: (id, data) =>
    axiosClient.post(`/assets/vehicles/${id}/unassign`, data),

  // Get available vehicles only
  getAvailableVehicles: () =>
    axiosClient.get('/assets/vehicles', { params: { status: 'Available' } }),
};

export default assetApi;