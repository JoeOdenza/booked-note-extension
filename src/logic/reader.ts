import { askClaudeWithFile, buildExtractionPrompt } from "./claude"
import { PAGE_FIELDS, type PageDataSchema } from "./storage"

async function getActiveTabId(): Promise<number> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) throw new Error("No active tab to capture")
    return tab.id
}

// Uses the Chrome DevTools Protocol (via chrome.debugger) to render the page exactly as
// Chrome's own "Print to PDF" would. Attaching shows Chrome's "<extension> started debugging
// this browser" infobar for as long as the session is open, so we detach right after.
// Returns the PDF as base64 (no "data:" prefix) -- pass it straight into a Claude document
// content block, or decode it into a Blob to download/preview.
export async function pageToPdf(tabId?: number): Promise<string> {
    const target = { tabId: tabId ?? (await getActiveTabId()) }
    console.log('target', target)

    await chrome.debugger.attach(target, "1.3")
    try {
        const result = (await chrome.debugger.sendCommand(target, "Page.printToPDF", {
            printBackground: true,
        })) as { data: string }

        return result.data
    } finally {
        await chrome.debugger.detach(target)
    }
}

// Decodes a base64 string (as returned by pageToPdf) into a File the Files API can upload.
export function base64ToFile(base64: string, filename: string, mimeType: string): File {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new File([bytes], filename, { type: mimeType })
}

// Captures the active tab as a PDF, uploads it to Claude, and asks it to extract PAGE_FIELDS
// into JSON -- the Claude-mode counterpart to DOM-mode's CSS-selector extraction.
export async function extractPageDataWithClaude(tabId?: number): Promise<PageDataSchema> {
    const base64 = await pageToPdf(tabId)
    const file = base64ToFile(base64, "page.pdf", "application/pdf")
    const prompt = buildExtractionPrompt(PAGE_FIELDS)
    const response = await askClaudeWithFile(prompt, file)

    return JSON.parse(stripCodeFence(response)) as PageDataSchema
}

// Claude is told to respond with raw JSON only, but models sometimes wrap it in a
// ```json ... ``` fence anyway -- strip one off if present before parsing.
function stripCodeFence(text: string): string {
    return text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
}