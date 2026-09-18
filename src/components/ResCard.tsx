import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CopyFieldRow from "./CopyFieldRow"
import { RES_CARD_SELECTION_SCHEMA, SHARED_FIELD_DATA_KEY } from "../schema"
import type { FieldValues, ResCardTabKey, Reservations, StorageShape } from "@/types"

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

    // The "resCard" tab's fields (trip_name, marketing_source, group_type, ...) describe the
    // card/cert as a whole, not any one reservation, so they live in their own storage slot --
    // loaded here and kept live via onChanged, since nothing else re-renders this component
    // when scripting.ts writes to it (e.g. after matching the OdenzaReg certificate code).
    const [resCardFieldValues, setResCardFieldValues] = useState<FieldValues>({})

    useEffect(() => {
        chrome.storage.local.get<StorageShape>("resCardFieldValues").then((stored) => {
            setResCardFieldValues(stored.resCardFieldValues || {})
        })

        function onChanged(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
            if (areaName === "local" && changes.resCardFieldValues) {
                setResCardFieldValues(changes.resCardFieldValues.newValue || {})
            }
        }

        chrome.storage.onChanged.addListener(onChanged)
        return () => chrome.storage.onChanged.removeListener(onChanged)
    }, [])

    // The other tabs' fields are display-only lookups against the selected reservation's stored
    // values -- a field only shows something when its key happens to match one already
    // scanned into that reservation elsewhere in the app; everything else stays blank.
    const sourceValues: FieldValues = reservations[selectedReservationId]?.fieldValues || {}

    // Additional travelers are scanned on the Booked Note's own "Additional Fields" tab (shared
    // across the whole booked note, not per reservation), each one's fields keyed as
    // "traveler_<index>_<field key>" -- see AdditionalTravelersBox.tsx. Loaded here and kept live
    // the same way as resCardFieldValues above.
    const [additionalFieldValues, setAdditionalFieldValues] = useState<FieldValues>({})

    useEffect(() => {
        chrome.storage.local.get<StorageShape>("layoutData").then((stored) => {
            setAdditionalFieldValues(stored.layoutData?.additional_bookednote_fields?.[SHARED_FIELD_DATA_KEY] || {})
        })

        function onChanged(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
            if (areaName !== "local" || !changes.layoutData) return
            const newLayoutData = changes.layoutData.newValue as StorageShape["layoutData"] | undefined
            setAdditionalFieldValues(newLayoutData?.additional_bookednote_fields?.[SHARED_FIELD_DATA_KEY] || {})
        }

        chrome.storage.onChanged.addListener(onChanged)
        return () => chrome.storage.onChanged.removeListener(onChanged)
    }, [])

    const travelerCount = Math.min(9, Math.max(0, Number(additionalFieldValues.additional_travelers_num) || 0))
    const travelerIndexes = Array.from({ length: travelerCount }, (_, i) => i + 1)
    const [selectedTravelerIndex, setSelectedTravelerIndex] = useState(1)

    // Keep the selection in range if the booked note's traveler count shrinks (or starts at 0).
    useEffect(() => {
        if (travelerCount === 0) return
        if (selectedTravelerIndex > travelerCount) setSelectedTravelerIndex(travelerCount)
    }, [travelerCount, selectedTravelerIndex])

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

                        {tabKey === "additionalTravler" && (
                            travelerCount === 0 ? (
                                <p>No additional travelers on this booked note.</p>
                            ) : (
                                <div className="layoutRow">
                                    <label>Traveler</label>
                                    <select
                                        value={selectedTravelerIndex}
                                        onChange={(e) => setSelectedTravelerIndex(Number(e.target.value))}
                                    >
                                        {travelerIndexes.map((index) => (
                                            <option key={index} value={index}>Traveler {index}</option>
                                        ))}
                                    </select>
                                </div>
                            )
                        )}

                        {!(tabKey === "additionalTravler" && travelerCount === 0) && (
                            <div className="resCardFields">
                                {RES_CARD_SELECTION_SCHEMA[tabKey].map((field) => {
                                    const key = tabKey === "additionalTravler"
                                        ? `traveler_${selectedTravelerIndex}_${field.key}`
                                        : field.key
                                    const values = tabKey === "resCard" ? resCardFieldValues
                                        : tabKey === "additionalTravler" ? additionalFieldValues
                                        : sourceValues

                                    return (
                                        <CopyFieldRow
                                            key={field.key}
                                            field={field}
                                            value={values[key] || ""}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    )
}
