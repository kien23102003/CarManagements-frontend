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

  // ===== DROPDOWN DATA ENDPOINTS =====
  
  // Get vehicle models for dropdown
  getVehicleModels: () =>
    axiosClient.get('/assets/vehicles/models'),

  // Get branches for dropdown
  getBranches: () =>
    axiosClient.get('/assets/vehicles/branches'),

  // Get drivers for dropdown
  getDrivers: () =>
    axiosClient.get('/assets/vehicles/drivers'),
};

export default assetApi;
