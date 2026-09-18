import PaymentBox from "./PaymentBox"

export default function PaymentFields({ paymentCount, fieldValues, onFieldChange, onScan }) {
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
