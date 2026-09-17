import { useEffect, useRef, useState } from "react"
import { FIELD_SCHEMA } from "./schema"
import FieldRow from "./FieldRow"

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab
}

async function ensureContentScript(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId },
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

    return (
        <>
            <header>
                <h1>BookedNotes</h1>
            </header>

            <section className="panel">
                <h2>Layout</h2>

                <div className="layoutRow">
                    <select
                        value={selectedLayout}
                        disabled={!isIdle}
                        onChange={(e) => setSelectedLayout(e.target.value)}
                    >
                        <option value="">-- Select Layout --</option>
                        {Object.keys(layouts).map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button
                        className="primary"
                        disabled={!isIdle}
                        onClick={() => selectedLayout && applyLayout(selectedLayout)}
                    >
                        Apply
                    </button>
                    <button className="danger" disabled={!isIdle} onClick={handleDeleteLayout}>
                        Delete
                    </button>
                </div>

                <div className="layoutRow">
                    {mode === "idle" && (
                        <button onClick={handleNewLayout}>+ New Layout</button>
                    )}

                    {mode === "naming" && (
                        <>
                            <input
                                type="text"
                                placeholder="Layout name"
                                value={layoutNameDraft}
                                autoFocus
                                onChange={(e) => setLayoutNameDraft(e.target.value)}
                            />
                            <button className="primary" onClick={handleStartLayout}>
                                Start Selecting Fields
                            </button>
                            <button onClick={handleCancelLayout}>Cancel</button>
                        </>
                    )}

                    {mode === "creating" && (
                        <>
                            <button className="primary" onClick={handleSaveLayout}>Save Layout</button>
                            <button onClick={handleCancelLayout}>Cancel</button>
                        </>
                    )}
                </div>

                {mode === "creating" && (
                    <p id="layoutStatus">
                        Creating layout &quot;{draftLayoutName}&quot; -- click Scan next to each field, then Save Layout.
                    </p>
                )}
                {mode !== "creating" && status && <p id="layoutStatus">{status}</p>}
            </section>

            <section className="panel">
                <div className="sectionHeader">
                    <h2>Fields</h2>
                    <button onClick={handleReset}>Reset</button>
                </div>

                <div id="fields">
                    {FIELD_SCHEMA.map((field) => (
                        <FieldRow
                            key={field.key}
                            field={field}
                            value={fieldValues[field.key] || ""}
                            onChange={(value) => handleFieldChange(field.key, value)}
                            onScan={() => startScanning(field.key)}
                        />
                    ))}
                </div>
            </section>
        </>
    )
}
