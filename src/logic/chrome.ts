export async function highlightSelector(selector: string) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if(!tab?.id)
        return
    return chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_SELECTOR", selector })
}

export async function fillExpectedValues(): Promise<{ ok: boolean, error?: string } | undefined> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if(!tab?.id)
        return
    return chrome.tabs.sendMessage(tab.id, { type: "FILL_EXPECTED_VALUES" })
}
