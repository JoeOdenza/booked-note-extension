import { useEffect, useRef, useState } from "react"
import { FIELD_SCHEMA } from "./schema"
import Header from "./components/Header"
import LayoutPanel from "./components/LayoutPanel"
import FieldsPanel from "./components/FieldsPanel"

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab
}

async function ensureContentScript(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ["content.js"]
    })
}

export default function App() {
    const [fieldValues, setFieldValues] = useState({})
    const [layouts, setLayouts] = useState({})
    const [selectedLayout, setSelectedLayout] = useState("")
    const [mode, setMode] = useState("idle") // "idle" | "naming" | "creating"
    const [draftLayoutName, setDraftLayoutName] = useState("")
    const [draftLayout, setDraftLayout] = useState({})
    const [layoutNameDraft, setLayoutNameDraft] = useState("")
    const [status, setStatus] = useState("")
    const [hasHighlights, setHasHighlights] = useState(false)

    const modeRef = useRef(mode)
    useEffect(() => {
        modeRef.current = mode
    }, [mode])

    useEffect(() => {
        refreshLayouts()

        function onMessage(message) {
            if (message.type === "FIELD_PICKED") {
                setFieldValues((prev) => ({ ...prev, [message.key]: message.value }))

                if (modeRef.current === "creating") {
                    setDraftLayout((prev) => ({ ...prev, [message.key]: message.selector }))
                }
            }

            if (message.type === "LAYOUT_APPLIED") {
                setFieldValues((prev) => ({ ...prev, ...message.results }))
                setHasHighlights(true)
            }
        }

        chrome.runtime.onMessage.addListener(onMessage)
        return () => chrome.runtime.onMessage.removeListener(onMessage)
    }, [])

    async function refreshLayouts() {
        const stored = await chrome.storage.local.get("layouts")
        setLayouts(stored.layouts || {})
    }

    async function startScanning(key) {
        try {
            const tab = await getActiveTab()
            await ensureContentScript(tab.id)
            await chrome.tabs.sendMessage(tab.id, { type: "PICK_FIELD", key })
        } catch (error) {
            setStatus(`Scan failed: ${error.message}`)
        }
    }

    async function applyLayout(name) {
        const layout = layouts[name]
        if (!layout) return

        try {
            const tab = await getActiveTab()
            await ensureContentScript(tab.id)
            await chrome.tabs.sendMessage(tab.id, { type: "APPLY_LAYOUT", layout })
        } catch (error) {
            setStatus(`Apply layout failed: ${error.message}`)
        }
    }

    async function handleClearHighlights() {
        try {
            const tab = await getActiveTab()
            await ensureContentScript(tab.id)
            await chrome.tabs.sendMessage(tab.id, { type: "CLEAR_HIGHLIGHTS" })
            setHasHighlights(false)
        } catch (error) {
            setStatus(`Clear highlight failed: ${error.message}`)
        }
    }

    function handleFieldChange(key, value) {
        setFieldValues((prev) => ({ ...prev, [key]: value }))
    }

    function handleReset() {
        setFieldValues({})
    }

    function handleNewLayout() {
        setStatus("")
        setLayoutNameDraft("")
        setMode("naming")
    }

    function handleStartLayout() {
        const name = layoutNameDraft.trim()
        if (!name) return

        setStatus("")
        setDraftLayoutName(name)
        setDraftLayout({})
        setMode("creating")
    }

    async function handleSaveLayout() {
        const stored = await chrome.storage.local.get("layouts")
        const allLayouts = { ...(stored.layouts || {}), [draftLayoutName]: draftLayout }

        await chrome.storage.local.set({ layouts: allLayouts })

        setLayouts(allLayouts)
        setSelectedLayout(draftLayoutName)
        setStatus("")
        setMode("idle")
    }

    function handleCancelLayout() {
        setStatus("")
        setDraftLayout({})
        setMode("idle")
    }

    async function handleDeleteLayout() {
        if (!selectedLayout) return

        const stored = await chrome.storage.local.get("layouts")
        const allLayouts = { ...(stored.layouts || {}) }
        delete allLayouts[selectedLayout]

        await chrome.storage.local.set({ layouts: allLayouts })
        setLayouts(allLayouts)
        setSelectedLayout("")
    }

    const isIdle = mode === "idle"
    const paymentCount = Number(fieldValues.paymentCount) || 0

    return (
        <>
            <Header />

            <LayoutPanel
                layouts={layouts}
                selectedLayout={selectedLayout}
                onSelectedLayoutChange={setSelectedLayout}
                isIdle={isIdle}
                hasHighlights={hasHighlights}
                onApply={applyLayout}
                onDelete={handleDeleteLayout}
                onClearHighlights={handleClearHighlights}
                mode={mode}
                layoutNameDraft={layoutNameDraft}
                onLayoutNameDraftChange={setLayoutNameDraft}
                onNewLayout={handleNewLayout}
                onStartLayout={handleStartLayout}
                onSaveLayout={handleSaveLayout}
                onCancelLayout={handleCancelLayout}
                draftLayoutName={draftLayoutName}
                status={status}
            />

            <FieldsPanel
                fields={FIELD_SCHEMA}
                fieldValues={fieldValues}
                paymentCount={paymentCount}
                onFieldChange={handleFieldChange}
                onScan={startScanning}
                onReset={handleReset}
            />
        </>
    )
}
