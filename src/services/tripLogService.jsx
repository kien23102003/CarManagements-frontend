import axiosClient from "../api/axiosClient";

export const getVehicleTripHistory = async (vehicleId) => {
  const params = vehicleId ? { vehicleId } : {};
  const res = await axiosClient.get(`/trips/vehicle/history`, { params });
  return res.data;
};

export const getTripHistoryByVehicle = async (vehicleId) => {
  const res = await axiosClient.get(`/trips/vehicle/${vehicleId}/history`);
  return res.data;
};

export const getManageVehicles = async (tab) => {
  const res = await axiosClient.get(`/trips/manage/vehicles`, { params: { tab } });
  return res.data;
};

export const getVehiclesForDropdown = async () => {
  const res = await axiosClient.get(`/trips/vehicle-drop`);
  return res.data;
};

export const getDriverByVehicle = async (vehicleId) => {
  const res = await axiosClient.get(`/trips/vehicle/${vehicleId}/driver`);
  return res.data;
};

export const startTrip = async (data) => {
  const res = await axiosClient.post("/trips/start", data);
  return res.data;
};

export const endTrip = async (tripId, data) => {
  const res = await axiosClient.put(`/trips/${tripId}/end`, data);
  return res.data;
};

export const getPendingTransfers = async () => {
  const res = await axiosClient.get("/trips/pending-transfers");
  return res.data;
};

export const getInTransitTransfers = async () => {
  const res = await axiosClient.get("/trips/intransit-transfers");
  return res.data;
};
