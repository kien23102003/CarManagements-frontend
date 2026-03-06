import axiosClient from "../api/axiosClient";

export interface TripLog {
  id: number;
  vehicleId: number;
  driverId: number;
  startTime: string;
  endTime: string | null;
  startMileage: number;
  endMileage: number | null;
  origin: string;
  destination: string;
  purpose?: string;
  createdAt: string;
}

export interface StartTripRequest {
  vehicleId: number;
  driverId: number;
  startMileage: number;
  origin: string;
  destination: string;
  purpose?: string;
}

export interface EndTripRequest {
  endMileage: number;
  destination: string;
}

export const getTripLogs = async (): Promise<TripLog[]> => {
  const res = await axiosClient.get("/TripLog");
  return res.data;
};

export const getTripLogById = async (id: number): Promise<TripLog> => {
  const res = await axiosClient.get(`/TripLog/${id}`);
  return res.data;
};

export const startTrip = async (data: StartTripRequest) => {
  const res = await axiosClient.post("/TripLog/start", data);
  return res.data;
};

export const endTrip = async (id: number, data: EndTripRequest) => {
  const res = await axiosClient.put(`/TripLog/${id}/end`, data);
  return res.data;
};