import { useEffect, useState } from "react"
import { TripLog } from "../types/tripLog"
import { getTripLogs } from "../services/tripLogService"
import StartTripModal from "../components/StartTripModal"
import EndTripModal from "../components/EndTripModal"
import "../styles/tripLogs.css"

export default function TripLogsPage() {
    const [trips, setTrips] = useState<TripLog[]>([])
    const [selectedTrip, setSelectedTrip] = useState<number | null>(null)

    const loadTrips = async () => {
        const data = await getTripLogs()
        setTrips(data)
    }

    useEffect(() => {
        loadTrips()
    }, [])

    return (
        <div className="page">

            <h1 className="title">Trip Logs</h1>

            <div className="card">
                <StartTripModal onSuccess={loadTrips} />
            </div>

            {selectedTrip && (
                <div className="modal">
                    <EndTripModal
                        tripId={selectedTrip}
                        onSuccess={() => {
                            setSelectedTrip(null)
                            loadTrips()
                        }}
                    />
                </div>
            )}

            <table className="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Origin</th>
                        <th>Destination</th>
                        <th>Start Mileage</th>
                        <th>End Mileage</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {trips.map((t) => (
                        <tr key={t.id}>
                            <td>{t.id}</td>
                            <td>{t.vehicleId}</td>
                            <td>{t.driverId}</td>
                            <td>{t.origin}</td>
                            <td>{t.destination}</td>
                            <td>{t.startMileage}</td>
                            <td>{t.endMileage ?? "-"}</td>

                            <td>
                                {t.endTime ? (
                                    <span className="status-completed">Completed</span>
                                ) : (
                                    <span className="status-running">Running</span>
                                )}
                            </td>

                            <td>
                                {!t.endTime && (
                                    <button
                                        className="action-btn"
                                        onClick={() => setSelectedTrip(t.id)}
                                    >
                                        End Trip
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    )
}