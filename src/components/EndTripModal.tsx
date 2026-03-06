import { useState } from "react"
import { endTrip } from "../services/tripLogService"

export default function EndTripModal({ tripId, onSuccess }: any) {
    const [endMileage, setEndMileage] = useState(0)
    const [destination, setDestination] = useState("")

    const handleSubmit = async (e: any) => {
        e.preventDefault()

        await endTrip(tripId, {
            endMileage,
            destination
        })

        onSuccess()
    }

    return (
        <form onSubmit={handleSubmit} className="form">
            <input
                placeholder="End Mileage"
                onChange={(e) => setEndMileage(Number(e.target.value))}
            />

            <input
                placeholder="Destination"
                onChange={(e) => setDestination(e.target.value)}
            />

            <button type="submit">End Trip</button>
        </form>
    )
}