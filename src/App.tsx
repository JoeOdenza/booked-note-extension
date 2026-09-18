import { useEffect, useRef, useState } from "react"
import { SCHEMA_BY_TAB, SHARED_FIELD_DATA_KEY, SHARED_FIELD_TABS } from "./schema"
import Header from "./components/Header"
import LayoutPanel from "./components/LayoutPanel"
import ReservationPanel from "./components/ReservationPanel"
import FieldsPanel from "./components/FieldsPanel"
import ResCard from "./components/ResCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getActiveTab, fillBookedNote, computeBookedNoteFieldsFromLocalStore, matchGroupTypeAndMarketingSource } from "./scripting"
import type { FieldValues, Layout, Layouts, Mode, Reservation, Reservations, StorageShape, TabKey } from "./types"


async function ensureContentScript(tabId: number) {
    await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ["content.js"]
    })
}

function sharesFieldsAcrossLayouts(tab: TabKey) {
    return SHARED_FIELD_TABS.includes(tab)
}

// "reservation_1", "reservation_2", ... -- always the highest used number plus one, so a
// deleted reservation's number is never reused and collides with nothing still stored.
function getNextReservationId(existing: Reservations): string {
    const usedNumbers = Object.keys(existing)
        .map((key) => Number(key.match(/^reservation_(\d+)$/)?.[1]))
        .filter((n) => !Number.isNaN(n))
    const next = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1
    return `reservation_${next}`
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
    const [mainTab, setMainTab] = useState<"bookedNote" | "resCard">("bookedNote")

    const [reservations, setReservations] = useState<Reservations>({})
    const [activeReservationId, setActiveReservationId] = useState("")
    const [isAddingReservation, setIsAddingReservation] = useState(false)
    const [reservationLabelDraft, setReservationLabelDraft] = useState("")

    // Every read-modify-write against the "reservations" storage key runs through this queue,
    // chained onto the previous write. Without it, two independent updates (e.g. a fieldValues
    // save and a layoutName save firing close together) can both read storage before either has
    // written back, so whichever writes last silently overwrites the other's change.
    const reservationsWriteQueueRef = useRef<Promise<void>>(Promise.resolve())

    function queueReservationsUpdate(mutate: (current: Reservations) => Reservations | null) {
        const next = reservationsWriteQueueRef.current.then(async () => {
            const stored = await chrome.storage.local.get<StorageShape>("reservations")
            const updated = mutate(stored.reservations || {})
            if (!updated) return

            await chrome.storage.local.set({ reservations: updated })
            setReservations(updated)
        })

        reservationsWriteQueueRef.current = next
        return next
    }

    const modeRef = useRef(mode)
    useEffect(() => {
        modeRef.current = mode
    }, [mode])

    useEffect(() => {
        refreshReservations()
    }, [])

    // Tracks which tab the OTHER pieces of state below (selectedLayout, activeReservationId, ...)
    // currently belong to. When activeTab itself just changed, those haven't been reset yet --
    // the tab-switch effect that clears them runs after this one in the same commit -- so this
    // effect would otherwise fire once using the NEW activeTab but the OLD tab's leftover
    // selectedLayout/fieldValues, writing them into the wrong tab's layoutData bucket.
    const persistedTabRef = useRef(activeTab)

    // Reservations own their field values in their own storage slot, independent of whichever
    // layout they're using to scan -- so two reservations can share a layout without colliding.
    useEffect(() => {
        const tabJustChanged = persistedTabRef.current !== activeTab
        persistedTabRef.current = activeTab
        if (tabJustChanged) return

        if (activeTab === "reservations") {
            if (!activeReservationId) return

            queueReservationsUpdate((current) => {
                const reservation = current[activeReservationId]
                if (!reservation) return null

                return { ...current, [activeReservationId]: { ...reservation, fieldValues } }
            })
            return
        }

        const isShared = sharesFieldsAcrossLayouts(activeTab)
        const activeLayoutName = mode === "creating" ? draftLayoutName : selectedLayout
        const dataKey = isShared ? SHARED_FIELD_DATA_KEY : activeLayoutName
        if (!dataKey) return

        chrome.storage.local.get<StorageShape>("layoutData").then((stored) => {
            const allData = { ...(stored.layoutData || {}) }
            const tabData = { ...(allData[activeTab] || {}), [dataKey]: fieldValues }
            allData[activeTab] = tabData
            chrome.storage.local.set({ layoutData: allData })
        })

        // As soon as the OdenzaReg certificate code is known, stamp its matching Marketing
        // Source/Group Code into the Res Card's own storage slot (ResCard listens for the change).
        if (activeTab === "odenzareg" && fieldValues.certificate_code) {
            matchGroupTypeAndMarketingSource(fieldValues.certificate_code)
        }
    }, [fieldValues, mode, selectedLayout, draftLayoutName, activeTab, activeReservationId])

    useEffect(() => {
        refreshLayouts(activeTab)
        setSelectedLayout("")
        setHasHighlights(false)
        setIsAddingReservation(false)
        setReservationLabelDraft("")

        if (activeTab === "reservations") {
            setActiveReservationId("")
            setFieldValues({})
        } else if (sharesFieldsAcrossLayouts(activeTab)) {
            chrome.storage.local.get<StorageShape>("layoutData").then((stored) => {
                setFieldValues(stored.layoutData?.[activeTab]?.[SHARED_FIELD_DATA_KEY] || {})
            })
        } else {
            setFieldValues({})
        }
    }, [activeTab])

    useEffect(() => {
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

    async function refreshLayouts(tab: TabKey) {
        const stored = await chrome.storage.local.get<StorageShape>("layouts")
        setLayouts(stored.layouts?.[tab] || {})
    }

    async function refreshReservations() {
        const stored = await chrome.storage.local.get<StorageShape>("reservations")
        setReservations(stored.reservations || {})
    }

    async function handleSelectedLayoutChange(name: string) {
        setSelectedLayout(name)

        // On the Reservations tab, a layout is just which selectors to Scan/Apply with --
        // field values live on the active reservation, not the layout, so just remember the choice.
        if (activeTab === "reservations") {
            if (activeReservationId) {
                await updateActiveReservationLayout(name)
            }
            return
        }

        // Shared-field tabs keep one field set regardless of which layout is selected
        if (sharesFieldsAcrossLayouts(activeTab)) return

        if (!name) {
            setFieldValues({})
            return
        }

        const stored = await chrome.storage.local.get<StorageShape>("layoutData")
        setFieldValues(stored.layoutData?.[activeTab]?.[name] || {})
    }

    function updateActiveReservationLayout(layoutName: string) {
        return queueReservationsUpdate((current) => {
            const reservation = current[activeReservationId]
            if (!reservation) return null

            return { ...current, [activeReservationId]: { ...reservation, layoutName } }
        })
    }

    async function handleSelectedReservationChange(id: string) {
        setActiveReservationId(id)

        if (!id) {
            setFieldValues({})
            setSelectedLayout("")
            return
        }

        const stored = await chrome.storage.local.get<StorageShape>("reservations")
        const reservation = stored.reservations?.[id]
        setFieldValues(reservation?.fieldValues || {})
        setSelectedLayout(reservation?.layoutName || "")
    }

    function handleStartAddReservation() {
        setStatus("")
        setReservationLabelDraft("")
        setIsAddingReservation(true)
    }

    function handleCancelAddReservation() {
        setIsAddingReservation(false)
        setReservationLabelDraft("")
    }

    async function handleCreateReservation() {
        const label = reservationLabelDraft.trim()
        if (!label) return

        let newId = ""
        await queueReservationsUpdate((current) => {
            newId = getNextReservationId(current)
            const reservation: Reservation = {
                id: newId,
                label,
                layoutName: selectedLayout,
                fieldValues: {},
                createdAt: Date.now()
            }
            return { ...current, [newId]: reservation }
        })

        setActiveReservationId(newId)
        setFieldValues({})
        setIsAddingReservation(false)
        setReservationLabelDraft("")
    }

    async function handleDeleteReservation() {
        if (!activeReservationId) return

        const label = reservations[activeReservationId]?.label ?? "this reservation"
        if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return

        const idToDelete = activeReservationId
        await queueReservationsUpdate((current) => {
            const updated = { ...current }
            delete updated[idToDelete]
            return updated
        })

        setActiveReservationId("")
        setFieldValues({})
        setSelectedLayout("")
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

    // Naming/creating a layout is tied to whichever tab was active when it started -- switching
    // tabs mid-creation would otherwise save the in-progress draft (and its scanned values) under
    // the new tab's schema instead of the one it was actually built against.
    function handleTabChange(value: string) {
        if (mode !== "idle") {
            setStatus("Finish or cancel the current layout before switching tabs.")
            return
        }
        setActiveTab(value as TabKey)
    }

    function handleReset() {
        setFieldValues({})
    }

    async function handleStartNewBookedNote() {
        setStatus("")
        setSelectedLayout("")
        setMode("idle")
        setDraftLayoutName("")
        setDraftLayout({})
        setFieldValues({})
        setActiveReservationId("")
        await handleClearHighlights()

        // Clear scanned field data for every tab/layout and every saved reservation, but leave
        // the saved layouts (selector mappings) alone -- those are reusable templates, not data
        await chrome.storage.local.set({ layoutData: {} })
        await queueReservationsUpdate(() => ({}))
        await chrome.storage.local.set({ resCardFieldValues: {} })
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
        const allLayouts = { ...(stored.layouts || {}) }
        const tabLayouts = { ...(allLayouts[activeTab] || {}), [draftLayoutName]: draftLayout }
        allLayouts[activeTab] = tabLayouts

        await chrome.storage.local.set({ layouts: allLayouts })

        setLayouts(tabLayouts)
        setSelectedLayout(draftLayoutName)
        setStatus("")
        setMode("idle")

        if (activeTab === "reservations" && activeReservationId) {
            await updateActiveReservationLayout(draftLayoutName)
        }
    }

    async function handleCancelLayout() {
        // Reservations and shared-field tabs keep whatever was scanned; only the in-progress
        // layout mapping is discarded, since field values don't live under the layout's name there
        if (activeTab !== "reservations" && !sharesFieldsAcrossLayouts(activeTab)) {
            const stored = await chrome.storage.local.get<StorageShape>("layoutData")
            const allData = { ...(stored.layoutData || {}) }
            const tabData = { ...(allData[activeTab] || {}) }
            delete tabData[draftLayoutName]
            allData[activeTab] = tabData
            await chrome.storage.local.set({ layoutData: allData })
            setFieldValues({})
        }

        setStatus("")
        setDraftLayout({})
        setMode("idle")
    }

    async function handleDeleteLayout() {
        if (!selectedLayout) return

        const stored = await chrome.storage.local.get<StorageShape>("layouts")
        const allLayouts = { ...(stored.layouts || {}) }
        const tabLayouts = { ...(allLayouts[activeTab] || {}) }
        delete tabLayouts[selectedLayout]
        allLayouts[activeTab] = tabLayouts

        const fieldsOwnedElsewhere = activeTab === "reservations" || sharesFieldsAcrossLayouts(activeTab)
        if (fieldsOwnedElsewhere) {
            await chrome.storage.local.set({ layouts: allLayouts })
        } else {
            const storedData = await chrome.storage.local.get<StorageShape>("layoutData")
            const allData = { ...(storedData.layoutData || {}) }
            const tabData = { ...(allData[activeTab] || {}) }
            delete tabData[selectedLayout]
            allData[activeTab] = tabData

            await chrome.storage.local.set({ layouts: allLayouts, layoutData: allData })
        }

        // The dropdown stays synced to the active reservation's layout, so deleting the
        // currently-selected layout always means clearing that reservation's reference to it
        const shouldClearReservationLayout = activeTab === "reservations" && !!activeReservationId
        setLayouts(tabLayouts)
        setSelectedLayout("")
        if (!fieldsOwnedElsewhere) setFieldValues({})
        if (shouldClearReservationLayout) await updateActiveReservationLayout("")
    }

    const isIdle = mode === "idle"
    const paymentCount = Number(fieldValues.paymentCount) || 0
    const additionalTravelerCount = Number(fieldValues.additional_travelers_num) || 0
    const activeSchema = SCHEMA_BY_TAB[activeTab]

    return (
        <>
            <Header />

            <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as "bookedNote" | "resCard")} className="w-[400px] mx-auto">
                <TabsList className="mx-auto">
                    <TabsTrigger value="bookedNote">Booked Note</TabsTrigger>
                    <TabsTrigger value="resCard">Res Card</TabsTrigger>
                </TabsList>

                <TabsContent value="bookedNote">
                    <div className="buttonRow">
                        <button className = "primary" onClick={async () => {
                            await fillBookedNote({
                                kind: "loss", lossAmount: 123, fulfillmentType: "RCI", paymentCurrency: "USD"
                            });
                            await computeBookedNoteFieldsFromLocalStore('RCI', 200);
                        }}>Fill Booked Note</button>
                        {/* <button onClick={async () => await fillBookedNote({ kind: "profit", profitAmount: 123,  paymentCurrency: "USD" })}>Fill BookNote</button> */}

                        <button onClick={handleStartNewBookedNote}>Start New Booked Note</button>
                    </div>

                    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="reservations">Reservations</TabsTrigger>
                        <TabsTrigger value="odenzareg">OdenzaReg</TabsTrigger>
                        <TabsTrigger value="additional_bookednote_fields">Additional Fields</TabsTrigger>
                    </TabsList>
                    <TabsContent value="reservations"></TabsContent>
                    <TabsContent value="odenzareg"></TabsContent>
                    </Tabs>

                    {activeTab === "reservations" && (
                        <ReservationPanel
                            reservations={reservations}
                            activeReservationId={activeReservationId}
                            onSelectedReservationChange={handleSelectedReservationChange}
                            isAdding={isAddingReservation}
                            reservationLabelDraft={reservationLabelDraft}
                            onReservationLabelDraftChange={setReservationLabelDraft}
                            onStartAddReservation={handleStartAddReservation}
                            onCreateReservation={handleCreateReservation}
                            onCancelAddReservation={handleCancelAddReservation}
                            onDeleteReservation={handleDeleteReservation}
                        />
                    )}

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
                </TabsContent>

                <TabsContent value="resCard">
                    <ResCard reservations={reservations} activeReservationId={activeReservationId} />
                </TabsContent>
            </Tabs>
        </>
    )
}
