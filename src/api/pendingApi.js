import axiosClient from './axiosClient';

const pendingApi = {
  getList: (params) =>
    axiosClient.get('/pending-requests', { params }),
};

export default pendingApi;
