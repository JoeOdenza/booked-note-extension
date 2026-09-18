export default function LayoutModeControls({
    mode,
    layoutNameDraft,
    onLayoutNameDraftChange,
    onNewLayout,
    onStartLayout,
    onSaveLayout,
    onCancelLayout
}) {
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
