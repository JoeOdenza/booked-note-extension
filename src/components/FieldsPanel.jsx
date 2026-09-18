import FieldList from "./FieldList"
import PaymentFields from "./PaymentFields"

export default function FieldsPanel({ fields, fieldValues, paymentCount, onFieldChange, onScan, onReset, showPaymentFields }) {
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
