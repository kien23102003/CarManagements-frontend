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

  // ===== ĐOI CHIẾU / KẾ HOẠCH MUA =====
  
  /** Lấy danh sách kế hoạch mua (approved proposals) */
  getPurchasePlans: (branchId) => {
    const params = branchId ? { branchId } : {};
    return axiosClient.get('/purchase-proposals/purchase-plans', { params });
  },

  /** Lấy kế hoạch mua theo chi nhánh (Manager xem tất cả) */
  getPurchasePlansByBranch: (branchId) =>
    axiosClient.get(`/purchase-proposals/purchase-plans?branchId=${branchId}`),

  /** Kế toán xác nhận thanh toán để tự động tạo xe mới */
  confirmPayment: (id) => axiosClient.post(`/purchase-proposals/${id}/confirm-payment`),

  /** Kế toán hoàn tác đối chiếu khi có lỗi */
  rollbackReception: (id, data) => axiosClient.post(`/purchase-proposals/${id}/rollback-reception`, data),
};

export default proposalApi;