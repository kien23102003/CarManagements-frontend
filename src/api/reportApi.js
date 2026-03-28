import axiosClient from './axiosClient';

const reportApi = {
  getEstimatedCosts: (branchId) =>
    axiosClient.get('/reports/estimated-costs', { params: branchId ? { branchId } : {} }),
  getEstimatedCostsByBranch: () =>
    axiosClient.get('/reports/estimated-costs/branches'),
};

export default reportApi;
