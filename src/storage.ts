import type { Pages } from "./types"

export async function getPages(): Promise<Pages> {
    const { pages } = await chrome.storage.local.get<{ pages?: Pages }>("pages")
    return pages ?? {}
}

export async function savePage(url: string, info: Record<string, unknown>): Promise<void> {
    const pages = await getPages()
    pages[url] = { ...info, capturedAt: Date.now() }
    await chrome.storage.local.set({ pages })
}
