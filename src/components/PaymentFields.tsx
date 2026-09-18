import PaymentBox from "./PaymentBox"
import type { FieldValues } from "@/types"

interface PaymentFieldsProps {
    paymentCount: number
    fieldValues: FieldValues
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
}

export default function PaymentFields({ paymentCount, fieldValues, onFieldChange, onScan }: PaymentFieldsProps) {
    if (paymentCount <= 0) return null

    const indexes = Array.from({ length: paymentCount }, (_, i) => i + 1)

    return (
        <div id="paymentFields">
            {indexes.map((index) => (
                <PaymentBox
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
