import type { Pages } from "./types"
import type { PageDataSchema } from "./logic/storage"

export async function getPages(): Promise<Pages> {
    const { pages } = await chrome.storage.local.get<{ pages?: Pages }>("pages")
    return pages ?? {}
}

export async function savePage(url: string, info: PageDataSchema): Promise<void> {
    const pages = await getPages()
    pages[url] = { ...info, capturedAt: Date.now() }
    await chrome.storage.local.set({ pages })
}
