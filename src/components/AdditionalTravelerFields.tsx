import AdditionalTravelersBox from "./AdditionalTravelersBox"
import type { FieldValues } from "@/types"

interface AdditionalTravelerFieldProps {
    addTravelerCount: number
    fieldValues: FieldValues
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
}


export default function AdditionalTravelerFields({ addTravelerCount, fieldValues, onFieldChange, onScan }: AdditionalTravelerFieldProps) {
    if (addTravelerCount <= 0) return null

    const indexes = Array.from({ length: addTravelerCount }, (_, i) => i + 1)

    return (
        <div id="addTravelerFields">
            {indexes.map((index) => (
                <AdditionalTravelersBox
                    key={index}
                    index={index}
                    fieldValues={fieldValues}
                    onFieldChange={onFieldChange}
                    onScan={onScan}
                />
            ))}
        </div>
    )
}