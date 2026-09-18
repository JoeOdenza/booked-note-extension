import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CopyFieldRow from "./CopyFieldRow"
import { RES_CARD_SELECTION_SCHEMA } from "../schema"
import type { FieldValues, ResCardTabKey, Reservations } from "@/types"

const RES_CARD_TAB_LABELS: Record<ResCardTabKey, string> = {
    resCard: "Res Card",
    reservations: "Reservation",
    additionalTravler: "Additional Traveler"
}

interface ResCardProps {
    reservations: Reservations
    activeReservationId: string
}

export default function ResCard({ reservations, activeReservationId }: ResCardProps) {
    const [resCardTab, setResCardTab] = useState<ResCardTabKey>("resCard")

    // ResCard picks its own reservation independently of the Booked Note tab's selection --
    // it starts synced to whatever's active there, but the user can switch it here without
    // disturbing that flow.
    const [selectedReservationId, setSelectedReservationId] = useState(activeReservationId)
    const reservationList = Object.values(reservations).sort((a, b) => a.createdAt - b.createdAt)

    // Res Card fields are display-only lookups against the selected reservation's stored
    // values -- a field only shows something when its key happens to match one already
    // scanned into that reservation elsewhere in the app; everything else stays blank.
    const sourceValues: FieldValues = reservations[selectedReservationId]?.fieldValues || {}

    return (
        <section className="panel">
            <Tabs value={resCardTab} onValueChange={(value) => setResCardTab(value as ResCardTabKey)} className="w-full">
                <TabsList>
                    {(Object.keys(RES_CARD_SELECTION_SCHEMA) as ResCardTabKey[]).map((tabKey) => (
                        <TabsTrigger key={tabKey} value={tabKey}>{RES_CARD_TAB_LABELS[tabKey]}</TabsTrigger>
                    ))}
                </TabsList>

                {(Object.keys(RES_CARD_SELECTION_SCHEMA) as ResCardTabKey[]).map((tabKey) => (
                    <TabsContent key={tabKey} value={tabKey}>
                        {tabKey === "reservations" && (
                            <div className="layoutRow">
                                <label>Reservation</label>
                                <select
                                    value={selectedReservationId}
                                    onChange={(e) => setSelectedReservationId(e.target.value)}
                                >
                                    <option value="">-- Select Reservation --</option>
                                    {reservationList.map((reservation) => (
                                        <option key={reservation.id} value={reservation.id}>{reservation.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="resCardFields">
                            {RES_CARD_SELECTION_SCHEMA[tabKey].map((field) => (
                                <CopyFieldRow
                                    key={field.key}
                                    field={field}
                                    value={sourceValues[field.key] || ""}
                                />
                            ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    )
}
