import type { Mode } from "@/types"

interface LayoutModeControlsProps {
    mode: Mode
    layoutNameDraft: string
    onLayoutNameDraftChange: (value: string) => void
    onNewLayout: () => void
    onStartLayout: () => void
    onSaveLayout: () => void
    onCancelLayout: () => void
}

export default function LayoutModeControls({
    mode,
    layoutNameDraft,
    onLayoutNameDraftChange,
    onNewLayout,
    onStartLayout,
    onSaveLayout,
    onCancelLayout
}: LayoutModeControlsProps) {
    return (
        <div className="layoutRow">
            {mode === "idle" && (
                <button onClick={onNewLayout}>+ New Layout</button>
            )}

            {mode === "naming" && (
                <>
                    <input
                        type="text"
                        placeholder="Layout name"
                        value={layoutNameDraft}
                        autoFocus
                        onChange={(e) => onLayoutNameDraftChange(e.target.value)}
                    />
                    <button className="primary" onClick={onStartLayout}>
                        Start Selecting Fields
                    </button>
                    <button onClick={onCancelLayout}>Cancel</button>
                </>
            )}

            {mode === "creating" && (
                <>
                    <button className="primary" onClick={onSaveLayout}>Save Layout</button>
                    <button onClick={onCancelLayout}>Cancel</button>
                </>
            )}
        </div>
    )
}
