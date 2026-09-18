import type { Reservations } from "@/types"

interface ReservationPanelProps {
    reservations: Reservations
    activeReservationId: string
    onSelectedReservationChange: (id: string) => void
    isAdding: boolean
    reservationLabelDraft: string
    onReservationLabelDraftChange: (value: string) => void
    onStartAddReservation: () => void
    onCreateReservation: () => void
    onCancelAddReservation: () => void
    onDeleteReservation: () => void
}

export default function ReservationPanel({
    reservations,
    activeReservationId,
    onSelectedReservationChange,
    isAdding,
    reservationLabelDraft,
    onReservationLabelDraftChange,
    onStartAddReservation,
    onCreateReservation,
    onCancelAddReservation,
    onDeleteReservation
}: ReservationPanelProps) {
    const reservationList = Object.values(reservations).sort((a, b) => a.createdAt - b.createdAt)

    return (
        <section className="panel">
            <h2>Reservation</h2>

            <div className="layoutRow">
                <select
                    value={activeReservationId}
                    disabled={isAdding}
                    onChange={(e) => onSelectedReservationChange(e.target.value)}
                >
                    <option value="">-- Select Reservation --</option>
                    {reservationList.map((reservation) => (
                        <option key={reservation.id} value={reservation.id}>{reservation.label}</option>
                    ))}
                </select>
                <button
                    className="danger"
                    disabled={isAdding || !activeReservationId}
                    onClick={onDeleteReservation}
                >
                    Delete
                </button>
            </div>

            <div className="layoutRow">
                {!isAdding ? (
                    <button onClick={onStartAddReservation}>+ Add Reservation</button>
                ) : (
                    <>
                        <input
                            type="text"
                            placeholder="Reservation label"
                            value={reservationLabelDraft}
                            autoFocus
                            onChange={(e) => onReservationLabelDraftChange(e.target.value)}
                        />
                        <button className="primary" onClick={onCreateReservation}>Create</button>
                        <button onClick={onCancelAddReservation}>Cancel</button>
                    </>
                )}
            </div>

            {!activeReservationId && !isAdding && (
                <p className="hintText">Select or add a reservation to begin.</p>
            )}
        </section>
    )
}
