import LayoutSelector from "./LayoutSelector"
import LayoutModeControls from "./LayoutModeControls"
import LayoutStatus from "./LayoutStatus"
import type { Layouts, Mode } from "@/types"

interface LayoutPanelProps {
    layouts: Layouts
    selectedLayout: string
    onSelectedLayoutChange: (name: string) => void
    isIdle: boolean
    hasHighlights: boolean
    onApply: (name: string) => void
    onDelete: () => void
    onClearHighlights: () => void
    mode: Mode
    layoutNameDraft: string
    onLayoutNameDraftChange: (value: string) => void
    onNewLayout: () => void
    onStartLayout: () => void
    onSaveLayout: () => void
    onCancelLayout: () => void
    draftLayoutName: string
    status: string
}

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
}: LayoutPanelProps) {
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
