import { useEffect, useRef, useState } from "react"
import { SCHEMA_BY_TAB } from "./schema"
import Header from "./components/Header"
import LayoutPanel from "./components/LayoutPanel"
import FieldsPanel from "./components/FieldsPanel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getActiveTab, fillBookedNote } from "./scripting"
import type { FieldValues, Layout, Layouts, Mode, StorageShape, TabKey } from "./types"


async function ensureContentScript(tabId: number) {
    await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ["content.js"]
    })
}

export default function App() {
    const [fieldValues, setFieldValues] = useState<FieldValues>({})
    const [layouts, setLayouts] = useState<Layouts>({})
    const [selectedLayout, setSelectedLayout] = useState("")
    const [mode, setMode] = useState<Mode>("idle")
    const [draftLayoutName, setDraftLayoutName] = useState("")
    const [draftLayout, setDraftLayout] = useState<Layout>({})
    const [layoutNameDraft, setLayoutNameDraft] = useState("")
    const [status, setStatus] = useState("")
    const [hasHighlights, setHasHighlights] = useState(false)
    const [activeTab, setActiveTab] = useState<TabKey>("reservations")

    const modeRef = useRef(mode)
    useEffect(() => {
        modeRef.current = mode
    }, [mode])

    useEffect(() => {
        const activeLayoutName = mode === "creating" ? draftLayoutName : selectedLayout
        if (!activeLayoutName) return

        chrome.storage.local.get<StorageShape>("layoutData").then((stored) => {
            const allData = { ...(stored.layoutData || {}), [activeLayoutName]: fieldValues }
            chrome.storage.local.set({ layoutData: allData })
        })
    }, [fieldValues, mode, selectedLayout, draftLayoutName])

    useEffect(() => {
        refreshLayouts()

        function onMessage(message: any, sender: chrome.runtime.MessageSender) {
            if (message.type === "FIELD_PICKED") {
                // TEMP: log the selector so it can be copied out and hardcoded elsewhere
                console.log(`[scan] ${message.key} ->`, message.selector)

                setFieldValues((prev) => ({ ...prev, [message.key]: message.value }))

                if (modeRef.current === "creating") {
                    setDraftLayout((prev) => ({ ...prev, [message.key]: message.selector }))
                }

                if (sender.tab?.id !== undefined) {
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
        const stored = await chrome.storage.local.get<StorageShape>("layouts")
        setLayouts(stored.layouts || {})
    }

    async function handleSelectedLayoutChange(name: string) {
        setSelectedLayout(name)

        if (!name) {
            setFieldValues({})
            return
        }

        const stored = await chrome.storage.local.get<StorageShape>("layoutData")
        setFieldValues(stored.layoutData?.[name] || {})
    }

    async function startScanning(key: string) {
        try {
            const tab = await getActiveTab()
            await ensureContentScript(tab.id!)
            await chrome.tabs.sendMessage(tab.id!, { type: "PICK_FIELD", key })
        } catch (error) {
            setStatus(`Scan failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async function applyLayout(name: string) {
        const layout = layouts[name]
        if (!layout) return

        try {
            const tab = await getActiveTab()
            await ensureContentScript(tab.id!)
            await chrome.tabs.sendMessage(tab.id!, { type: "APPLY_LAYOUT", layout })
        } catch (error) {
            setStatus(`Apply layout failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    async function handleClearHighlights() {
        try {
            const tab = await getActiveTab()
            await ensureContentScript(tab.id!)
            await chrome.tabs.sendMessage(tab.id!, { type: "CLEAR_HIGHLIGHTS" })
            setHasHighlights(false)
        } catch (error) {
            setStatus(`Clear highlight failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    function handleFieldChange(key: string, value: string) {
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
        const stored = await chrome.storage.local.get<StorageShape>("layouts")
        const allLayouts = { ...(stored.layouts || {}), [draftLayoutName]: draftLayout }

        await chrome.storage.local.set({ layouts: allLayouts })

        setLayouts(allLayouts)
        setSelectedLayout(draftLayoutName)
        setStatus("")
        setMode("idle")
    }

    async function handleCancelLayout() {
        const stored = await chrome.storage.local.get<StorageShape>("layoutData")
        const allData = { ...(stored.layoutData || {}) }
        delete allData[draftLayoutName]
        await chrome.storage.local.set({ layoutData: allData })

        setStatus("")
        setDraftLayout({})
        setFieldValues({})
        setMode("idle")
    }

    async function handleDeleteLayout() {
        if (!selectedLayout) return

        const stored = await chrome.storage.local.get<StorageShape>("layouts")
        const allLayouts = { ...(stored.layouts || {}) }
        delete allLayouts[selectedLayout]

        const storedData = await chrome.storage.local.get<StorageShape>("layoutData")
        const allData = { ...(storedData.layoutData || {}) }
        delete allData[selectedLayout]

        await chrome.storage.local.set({ layouts: allLayouts, layoutData: allData })
        setLayouts(allLayouts)
        setSelectedLayout("")
        setFieldValues({})
    }

    const isIdle = mode === "idle"
    const paymentCount = Number(fieldValues.paymentCount) || 0
    const additionalTravelerCount = Number(fieldValues.additional_travelers_num) || 0
    const activeSchema = SCHEMA_BY_TAB[activeTab]

    return (
        <>
            <Header />

            <button onClick={async () => await fillBookedNote({ kind: "loss", lossAmount: 123, fulfillmentType: "RCI", paymentCurrency: "USD" })}>Fill BookNote</button>
            {/* <button onClick={async () => await fillBookedNote({ kind: "profit", profitAmount: 123,  paymentCurrency: "USD" })}>Fill BookNote</button> */}

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList>
                <TabsTrigger value="reservations">Reservations</TabsTrigger>
                <TabsTrigger value="odenzareg">OdenzaReg</TabsTrigger>
                <TabsTrigger value="additional_bookednote_fields">Additional Fields</TabsTrigger>
            </TabsList>
            <TabsContent value="reservations">Make changes to your account here.</TabsContent>
            <TabsContent value="odenzareg">Change your password here.</TabsContent>
            </Tabs>

            <LayoutPanel
                layouts={layouts}
                selectedLayout={selectedLayout}
                onSelectedLayoutChange={handleSelectedLayoutChange}
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
                fields={activeSchema}
                fieldValues={fieldValues}
                paymentCount={paymentCount}
                onFieldChange={handleFieldChange}
                onScan={startScanning}
                onReset={handleReset}
                showPaymentFields={activeTab === "reservations"}
                showAdditionalTravelerFields={activeTab === "additional_bookednote_fields"}
                additionalTravelerCount={additionalTravelerCount}
            />
        </>
    )
}
