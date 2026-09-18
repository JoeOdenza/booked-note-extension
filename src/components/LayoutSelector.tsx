import type { Layouts } from "@/types"

interface LayoutSelectorProps {
    layouts: Layouts
    selectedLayout: string
    disabled: boolean
    hasHighlights: boolean
    onSelectedLayoutChange: (name: string) => void
    onApply: (name: string) => void
    onDelete: () => void
    onClearHighlights: () => void
}

export default function LayoutSelector({
    layouts,
    selectedLayout,
    disabled,
    hasHighlights,
    onSelectedLayoutChange,
    onApply,
    onDelete,
    onClearHighlights
}: LayoutSelectorProps) {
    return (
        <div className="layoutRow">
            <select
                value={selectedLayout}
                disabled={disabled}
                onChange={(e) => onSelectedLayoutChange(e.target.value)}
            >
                <option value="">-- Select Layout --</option>
                {Object.keys(layouts).map((name) => (
                    <option key={name} value={name}>{name}</option>
                ))}
            </select>
            <button
                className="primary"
                disabled={disabled}
                onClick={() => selectedLayout && onApply(selectedLayout)}
            >
                Apply
            </button>
            <button className="danger" disabled={disabled} onClick={onDelete}>
                Delete
            </button>
            {hasHighlights && (
                <button disabled={disabled} onClick={onClearHighlights}>
                    Clear Highlight
                </button>
            )}
        </div>
    )
}
