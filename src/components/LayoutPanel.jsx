import LayoutSelector from "./LayoutSelector"
import LayoutModeControls from "./LayoutModeControls"
import LayoutStatus from "./LayoutStatus"

export default function LayoutPanel({
    layouts,
    selectedLayout,
    onSelectedLayoutChange,
    isIdle,
    hasHighlights,
    onApply,
    onDelete,
    onClearHighlights,
    mode,
    layoutNameDraft,
    onLayoutNameDraftChange,
    onNewLayout,
    onStartLayout,
    onSaveLayout,
    onCancelLayout,
    draftLayoutName,
    status
}) {
    return (
        <section className="panel">
            <h2>Layout</h2>

            <LayoutSelector
                layouts={layouts}
                selectedLayout={selectedLayout}
                disabled={!isIdle}
                hasHighlights={hasHighlights}
                onSelectedLayoutChange={onSelectedLayoutChange}
                onApply={onApply}
                onDelete={onDelete}
                onClearHighlights={onClearHighlights}
            />

            <LayoutModeControls
                mode={mode}
                layoutNameDraft={layoutNameDraft}
                onLayoutNameDraftChange={onLayoutNameDraftChange}
                onNewLayout={onNewLayout}
                onStartLayout={onStartLayout}
                onSaveLayout={onSaveLayout}
                onCancelLayout={onCancelLayout}
            />

            <LayoutStatus mode={mode} draftLayoutName={draftLayoutName} status={status} />
        </section>
    )
}
