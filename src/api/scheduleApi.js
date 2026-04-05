import axiosClient from './axiosClient';

const scheduleApi = {
  getSchedules: (params) =>
    axiosClient.get('/schedules', { params }),

  getAvailability: (params) =>
    axiosClient.get('/schedules/availability', { params }),

  getDriverAvailability: (params) =>
    axiosClient.get('/schedules/availability/drivers', { params }),

  createSchedule: (data) =>
    axiosClient.post('/schedules', data),

  updateSchedule: (id, data) =>
    axiosClient.put(`/schedules/${id}`, data),

  extendSchedule: (id, data) =>
    axiosClient.post(`/schedules/${id}/extend`, data),

  startSchedule: (id, data) =>
    axiosClient.post(`/schedules/${id}/start`, data),

  endSchedule: (id, data) =>
    axiosClient.post(`/schedules/${id}/end`, data),

  getAuditsBySchedule: (id) =>
    axiosClient.get(`/schedules/${id}/audits`),

  getRecentAudits: (params) =>
    axiosClient.get('/schedules/audits', { params }),
};

export default scheduleApi;
