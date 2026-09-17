export default function FieldRow({ field, value, onChange, onScan }) {
    return (
        <div className="fieldRow">
            <label>{field.label}</label>

            {field.type === "select" ? (
                <select value={value} onChange={(e) => onChange(e.target.value)}>
                    <option value="">-- Select --</option>
                    {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            ) : (
                <>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <button onClick={onScan}>Scan</button>
                </>
            )}
        </div>
    )
}
