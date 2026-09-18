import FieldList from "./FieldList"
import PaymentFields from "./PaymentFields"
import type { Field, FieldValues } from "@/types"

interface FieldsPanelProps {
    fields: readonly Field[]
    fieldValues: FieldValues
    paymentCount: number
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
    onReset: () => void
    showPaymentFields: boolean
}

export default function FieldsPanel({ fields, fieldValues, paymentCount, onFieldChange, onScan, onReset, showPaymentFields }: FieldsPanelProps) {
    return (
        <section className="panel">
            <div className="sectionHeader">
                <h2>Fields</h2>
                <button onClick={onReset}>Reset</button>
            </div>

            <FieldList
                fields={fields}
                fieldValues={fieldValues}
                onFieldChange={onFieldChange}
                onScan={onScan}
            />

            {showPaymentFields && (
                <PaymentFields
                    paymentCount={paymentCount}
                    fieldValues={fieldValues}
                    onFieldChange={onFieldChange}
                    onScan={onScan}
                />
            )}
        </section>
    )
}
