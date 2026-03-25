import axiosClient from './axiosClient';

const receptionApi = {
  // ===== GET =====
  
  /** Lấy bản ghi đối chiếu theo ID */
  getById: (id) =>
    axiosClient.get(`/vehicle-receptions/${id}`),

  /** Lấy danh sách bản ghi theo Proposal ID */
  getByProposalId: (proposalId) =>
    axiosClient.get(`/vehicle-receptions/proposal/${proposalId}`),

  /** Lấy danh sách bản ghi theo Branch ID */
  getByBranchId: (branchId) =>
    axiosClient.get(`/vehicle-receptions/branch/${branchId}`),

  /** Lấy danh sách bản ghi chưa hoàn thành (Pending) */
  getPendingByBranch: (branchId) =>
    axiosClient.get(`/vehicle-receptions/branch/${branchId}/pending`),

  /** Lấy tất cả bản ghi (Manager only) */
  getAll: () =>
    axiosClient.get('/vehicle-receptions'),

  // ===== CREATE / UPDATE =====

  /** Tạo bản ghi đối chiếu mới */
  create: (data) =>
    axiosClient.post('/vehicle-receptions', data),

  /** Cập nhật bản ghi đối chiếu */
  update: (id, data) =>
    axiosClient.put(`/vehicle-receptions/${id}`, data),

  /** Hoàn thành bản ghi */
  complete: (id) =>
    axiosClient.post(`/vehicle-receptions/${id}/complete`),

  /** Từ chối bản ghi */
  reject: (id, data) =>
    axiosClient.post(`/vehicle-receptions/${id}/reject`, data),

  /** Xóa bản ghi */
  delete: (id) =>
    axiosClient.delete(`/vehicle-receptions/${id}`),
};

export default receptionApi;
