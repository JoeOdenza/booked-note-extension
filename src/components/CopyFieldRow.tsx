import { useState } from "react"
import type { Field } from "@/types"

interface CopyFieldRowProps {
    field: Field
    value: string
}

export default function CopyFieldRow({ field, value }: CopyFieldRowProps) {
    const [copied, setCopied] = useState(false)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
        } catch {
            // Clipboard access denied or unavailable -- nothing to recover from here
        }
    }

    return (
        <div className="fieldRow">
            <label>{field.label}</label>
            <input type="text" value={value} readOnly />
            <button onClick={handleCopy} disabled={!value}>{copied ? "Copied" : "Copy"}</button>
        </div>
    )
}
