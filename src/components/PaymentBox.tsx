import FieldRow from "./FieldRow"
import { PAYMENT_TYPE_OPTIONS, PAYMENT_BASE_FIELDS, PAYMENT_TYPE_EXTRA_FIELDS } from "../schema"
import type { Field, FieldValues } from "@/types"

function getPaymentFields(index: number, selectedType: string): Field[] {
    const prefix = `payment_${index}_`
    const extraFields = PAYMENT_TYPE_EXTRA_FIELDS[selectedType] || []

    return [
        { key: `${prefix}type`, label: "Payment Type", type: "select", options: PAYMENT_TYPE_OPTIONS },
        ...PAYMENT_BASE_FIELDS.map((field) => ({ ...field, key: `${prefix}${field.key}` })),
        ...extraFields.map((field) => ({ ...field, key: `${prefix}${field.key}` }))
    ]
}

interface PaymentBoxProps {
    index: number
    fieldValues: FieldValues
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
}

export default function PaymentBox({ index, fieldValues, onFieldChange, onScan }: PaymentBoxProps) {
    const selectedType = fieldValues[`payment_${index}_type`] || ""

    return (
        <div className="paymentBox">
            <h3>Payment {index}</h3>
            {getPaymentFields(index, selectedType).map((field) => (
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
