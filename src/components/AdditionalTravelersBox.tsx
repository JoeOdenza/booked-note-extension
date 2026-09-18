import type { FieldValues } from "@/types"
import FieldRow from "./FieldRow"
import { ADDITIONAL_TRAVELER_SCHEMA } from "../schema"

function getTravelerFields(index: number) {
    const prefix = `traveler_${index}_`
    return ADDITIONAL_TRAVELER_SCHEMA.map((field) => ({ ...field, key: `${prefix}${field.key}` }))
}

interface AdditionalTravelersBoxProps {
    index: number
    fieldValues: FieldValues
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
}

export default function AdditionalTravelersBox({ index, fieldValues, onFieldChange, onScan }: AdditionalTravelersBoxProps) {

    return (
        <div className="addTravelersBox">
            <div className="addTravelersBoxHeader">
                <span className="travelerBadge">{index}</span>
                <h3>Additional Traveler</h3>
            </div>
            {getTravelerFields(index).map((field) => (
                <FieldRow
                    key={field.key}
                    field={field}
                    value={fieldValues[field.key] || ""}
                    onChange={(value) => onFieldChange(field.key, value)}
                    onScan={() => onScan(field.key)}
                />
            ))}
        </div>
    )
}