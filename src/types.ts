import type { PageDataSchema } from "./logic/storage"

export type PageEntry = {
    capturedAt: number
    [field: string]: unknown
}

export type Pages = Record<string, PageEntry>

// Sent from the content script (index.ts) to the service worker, which owns writing
// to chrome.storage.local -- keeps content scripts from touching storage directly.
export interface PageCapturedMessage {
    type: "PAGE_CAPTURED"
    url: string
    info: PageDataSchema
}

// DOM-mode already has the data (extracted in the content script's own page context) and
// just hands it over. Claude-mode can't run itself in a content script -- chrome.tabs and
// chrome.debugger, which extractPageDataWithClaude needs, are only available in a privileged
// context (the service worker, here) -- so it sends a bare request instead and lets the
// service worker extract using the sender tab's own id.
export interface PageDataMessage {
    type: "PAGE_DATA"
    data: PageDataSchema
}

export interface ExtractClaudeMessage {
    type: "EXTRACT_CLAUDE"
}

export type ContentScriptMessage = PageDataMessage | ExtractClaudeMessage

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

export interface ResCardData {
  resCard: ResCardValues
  reservations: ReservationValues[]
  additionalTravelers: AdditionalTravelerValues[]
}

export interface ResCardPanelProps {
  data: ResCardData
}

export type BankPointType = "ATB" | "TD" | null

export type PageData = {
  certCode: string;
  certNum: number;
  groupCode: string;
  profitAndLossText: string;
  missingCurrencyElements: HTMLInputElement[];
  supplierAmountsUsd: number[];
  commAmountsUsd: number[];
  agentMarkup: number | null;
  agentMarkupCurrency: string | null;
  missingMarkupCurrency: boolean;
  inHouseCharge: number;
  certificateDeposit: number;
};

export type Expected = { expectedProfitAndLoss: number, expectedAgentMarkup: number}