import axiosClient from './axiosClient';

const userApi = {
  getProfile: () =>
    axiosClient.get('/user/profile'),
};

export default userApi;
