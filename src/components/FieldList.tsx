import FieldRow from "./FieldRow"
import type { Field, FieldValues } from "@/types"

interface FieldListProps {
    fields: Field[]
    fieldValues: FieldValues
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
}

export default function FieldList({ fields, fieldValues, onFieldChange, onScan }: FieldListProps) {
    return (
        <div id="fields">
            {fields.map((field) => (
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
