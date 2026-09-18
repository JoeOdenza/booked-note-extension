import { useEffect, useRef, useState } from "react"
import { SCHEMA_BY_TAB, FIELD_SCHEMA } from "./schema"
import Header from "./components/Header"
import LayoutPanel from "./components/LayoutPanel"
import FieldsPanel from "./components/FieldsPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { getActiveTab, fillBookedNote, FULFILLMENT_TYPE, PAYMENT_CURRENCY } from "./scripting"


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
    const [activeTab, setActiveTab] = useState("reservations")

    const modeRef = useRef(mode)
    useEffect(() => {
        modeRef.current = mode
    }, [mode])

    useEffect(() => {
        refreshLayouts()

        function onMessage(message, sender) {
            if (message.type === "FIELD_PICKED") {
                // TEMP: log the selector so it can be copied out and hardcoded elsewhere
                console.log(`[scan] ${message.key} ->`, message.selector)

                setFieldValues((prev) => ({ ...prev, [message.key]: message.value }))

                if (modeRef.current === "creating") {
                    setDraftLayout((prev) => ({ ...prev, [message.key]: message.selector }))
                }

                if (sender.tab) {
                    chrome.tabs.sendMessage(sender.tab.id, { type: "STOP_PICKING" }).catch(() => {})
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
    const activeSchema = SCHEMA_BY_TAB[activeTab] || FIELD_SCHEMA

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

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList>
                <TabsTrigger value="reservations">Reservations</TabsTrigger>
                <TabsTrigger value="odenzareg">OdenzaReg</TabsTrigger>
                <TabsTrigger value="additional_bookednote_fields">Additional Fields</TabsTrigger>
            </TabsList>
            <TabsContent value="reservations">Make changes to your account here.</TabsContent>
            <TabsContent value="odenzareg">Change your password here.</TabsContent>
            </Tabs>

            <FieldsPanel
                fields={activeSchema}
                fieldValues={fieldValues}
                paymentCount={paymentCount}
                onFieldChange={handleFieldChange}
                onScan={startScanning}
                onReset={handleReset}
                showPaymentFields={activeTab === "reservations"}
            />
        </>
    )
}
