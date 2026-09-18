import FieldRow from "./FieldRow"

export default function FieldList({ fields, fieldValues, onFieldChange, onScan }) {
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
