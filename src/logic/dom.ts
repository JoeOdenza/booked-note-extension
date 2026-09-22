import { PAGE_FIELDS, type PageDataSchema } from "./storage"

// Maps each PageDataSchema field to the CSS selector that holds it on a given page.
// Not every field needs an entry -- a page might not expose all of them.
export type DomExtractConfig = Record<keyof PageDataSchema, string>

// DOM-mode's counterpart to extractPageDataWithClaude in reader.ts -- reads each
// PageDataSchema field straight off the page via the given CSS selectors. Driven off the
// same PAGE_FIELDS list Claude-mode's prompt is built from, so both extraction paths
// return the exact same shape.
export function extractPageDataFromDom(extractConfig: DomExtractConfig): PageDataSchema {
    const data = {} as PageDataSchema

    for (const { key } of PAGE_FIELDS) {
        const selector = extractConfig[key]
        data[key] = selector ? (document.querySelector(selector)?.textContent?.trim() ?? "") : ""
    }

    return data
}
