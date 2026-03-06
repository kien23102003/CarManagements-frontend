import { useState } from "react"
import { startTrip } from "../services/tripLogService"

export default function StartTripModal({ onSuccess }: any) {
    const [vehicleId, setVehicleId] = useState(0)
    const [driverId, setDriverId] = useState(0)
    const [startMileage, setStartMileage] = useState(0)
    const [origin, setOrigin] = useState("")
    const [destination, setDestination] = useState("")
    const [purpose, setPurpose] = useState("")

    const handleSubmit = async (e: any) => {
        e.preventDefault()

        await startTrip({
            vehicleId,
            driverId,
            startMileage,
            origin,
            destination,
            purpose
        })

        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="form">

            <div className="form-group">
                <label>Vehicle ID</label>
                <input onChange={e => setVehicleId(Number(e.target.value))} />
            </div>

            <div className="form-group">
                <label>Driver ID</label>
                <input onChange={e => setDriverId(Number(e.target.value))} />
            </div>

            <div className="form-group">
                <label>Start Mileage</label>
                <input onChange={e => setStartMileage(Number(e.target.value))} />
            </div>

            <div className="form-group">
                <label>Origin</label>
                <input onChange={e => setOrigin(e.target.value)} />
            </div>

            <div className="form-group">
                <label>Destination</label>
                <input onChange={e => setDestination(e.target.value)} />
            </div>

            <div className="form-group">
                <label>Purpose</label>
                <input onChange={e => setPurpose(e.target.value)} />
            </div>

            <button type="submit">Start Trip</button>

        </form>
    )
}