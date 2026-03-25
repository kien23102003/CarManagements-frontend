import axiosClient from './axiosClient';

const accessoryApi = {
  getAccessories: (params) => axiosClient.get('/accessories', { params }),
  getAccessoryById: (id) => axiosClient.get(`/accessories/${id}`),
  createAccessory: (data) => axiosClient.post('/accessories', data),
  updateAccessory: (id, data) => axiosClient.put(`/accessories/${id}`, data),
  importAccessoryStock: (id, data) => axiosClient.post(`/accessories/${id}/import`, data),

  getBranchStocks: (params) => axiosClient.get('/branch-accessory-stock', { params }),
  upsertBranchStock: (data) => axiosClient.put('/branch-accessory-stock', data),

  getPurchaseRequests: (params) => axiosClient.get('/accessory-purchase-requests', { params }),
  getPurchaseRequestById: (id) => axiosClient.get(`/accessory-purchase-requests/${id}`),
  createPurchaseRequest: (data) => axiosClient.post('/accessory-purchase-requests', data),
  updatePurchaseRequest: (id, data) => axiosClient.put(`/accessory-purchase-requests/${id}`, data),
  deletePurchaseRequest: (id) => axiosClient.delete(`/accessory-purchase-requests/${id}`),
  approvePurchaseRequest: (id, data) => axiosClient.post(`/accessory-purchase-requests/${id}/approve`, data),
  rejectPurchaseRequest: (id, data) => axiosClient.post(`/accessory-purchase-requests/${id}/reject`, data),

  getGoodsReceipts: (params) => axiosClient.get('/accessory-goods-receipts', { params }),
  getGoodsReceiptById: (id) => axiosClient.get(`/accessory-goods-receipts/${id}`),
  createGoodsReceipt: (data) => axiosClient.post('/accessory-goods-receipts', data),
  completeGoodsReceipt: (id, data) => axiosClient.post(`/accessory-goods-receipts/${id}/complete`, data),
  cancelGoodsReceipt: (id, data) => axiosClient.post(`/accessory-goods-receipts/${id}/cancel`, data),

  getVehicleAccessoryRequirements: (params) =>
    axiosClient.get('/vehicle-accessory-requirements', { params }),
  createVehicleAccessoryRequirement: (data) =>
    axiosClient.post('/vehicle-accessory-requirements', data),
  updateVehicleAccessoryRequirement: (id, data) =>
    axiosClient.put(`/vehicle-accessory-requirements/${id}`, data),
  deleteVehicleAccessoryRequirement: (id) =>
    axiosClient.delete(`/vehicle-accessory-requirements/${id}`),
  checkVehicleAccessoryRequirements: (vehicleId) =>
    axiosClient.get(`/vehicle-accessory-requirements/check/vehicle/${vehicleId}`),

  issueVehicleAccessory: (data) => axiosClient.post('/vehicle-accessories/issue', data),
  returnVehicleAccessory: (id, data) => axiosClient.post(`/vehicle-accessories/${id}/return`, data),

  getVehicleAccessories: (vehicleId, activeOnly) =>
    axiosClient.get(`/vehicles/${vehicleId}/accessories`, { params: { activeOnly } }),

  getAccessoryTransactions: (params) => axiosClient.get('/accessory-transactions', { params }),
};

export default accessoryApi;
