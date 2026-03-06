export interface TripLog {
  id: number
  vehicleId: number
  driverId: number
  startTime: string
  endTime: string | null
  startMileage: number
  endMileage: number | null
  origin: string
  destination: string
  purpose?: string
  createdAt: string
}

export interface StartTripRequest {
  vehicleId: number
  driverId: number
  startMileage: number
  origin: string
  destination: string
  purpose?: string
}

export interface EndTripRequest {
  endMileage: number
  destination: string
}