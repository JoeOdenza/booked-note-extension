import FieldList from "./FieldList"
import PaymentFields from "./PaymentFields"
import AdditionalTravelerFields from "./AdditionalTravelerFields"
import type { Field, FieldValues } from "@/types"

interface FieldsPanelProps {
    fields: Field[]
    fieldValues: FieldValues
    paymentCount: number
    onFieldChange: (key: string, value: string) => void
    onScan: (key: string) => void
    onReset: () => void
    showPaymentFields: boolean
    showAdditionalTravelerFields?: boolean
    additionalTravelerCount?: number
}

export default function FieldsPanel({ fields, fieldValues, paymentCount, onFieldChange, onScan, onReset, showPaymentFields, showAdditionalTravelerFields, additionalTravelerCount = 0 }: FieldsPanelProps) {
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

            {showAdditionalTravelerFields && (
                <AdditionalTravelerFields
                    addTravelerCount={additionalTravelerCount}
                    fieldValues={fieldValues}
                    onFieldChange={onFieldChange}
                    onScan={onScan}
                />
            )}
        </section>
    )
}
