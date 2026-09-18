import type { Mode } from "@/types"

interface LayoutStatusProps {
    mode: Mode
    draftLayoutName: string
    status: string
}

export default function LayoutStatus({ mode, draftLayoutName, status }: LayoutStatusProps) {
    if (mode === "creating") {
        return (
            <p id="layoutStatus">
                Creating layout &quot;{draftLayoutName}&quot; -- click Scan next to each field, then Save Layout.
            </p>
        )
    }

    if (status) {
        return <p id="layoutStatus">{status}</p>
    }

    return null
}
