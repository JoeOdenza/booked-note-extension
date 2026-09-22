export type PageEntry = {
    capturedAt: number
    [field: string]: unknown
}

export type Pages = Record<string, PageEntry>

// Sent from the content script (reader.ts) to the service worker, which owns writing
// to chrome.storage.local -- keeps content scripts from touching storage directly.
export interface PageCapturedMessage {
    type: "PAGE_CAPTURED"
    url: string
    info: Record<string, unknown>
}

export interface Field {
    key: string
    label: string
    type?: "select" | "checkbox"
    options?: (string | number)[]
}

export type FieldValues = Record<string, string>

type ResCardValues = Record<string, string>
type ReservationValues = Record<string, string>
type AdditionalTravelerValues = Record<string, string>

interface ResCardData {
  resCard: ResCardValues
  reservations: ReservationValues[]
  additionalTravelers: AdditionalTravelerValues[]
}

export interface ResCardPanelProps {
  data: ResCardData
}


