// Every key this extension stores, and the type of value that lives under it. Add a new
// key here and every localStore.get/set call site gets autocomplete + type-checking for it --
// no runtime schema object needed, since keys only exist at the type level.
// Fields the DOM/Claude extraction pipeline captures per page -- see PageDataSchema below.
interface PageDataFields {
    confirmationNumber: string,
    resortName: string,
    checkInDate: string,
    checkOutDate: string,
    odenzaPrice: string,
    paymentCurrency: string,
    tripLocation: string,
}

interface AppStorageSchema extends PageDataFields {
    extractionMode: "claude" | "dom",
    marketing_source: string,
    group_type: string,
    branch_num: string,
    trip_region: string,
    trip_city: string,
    vendor_name: string,
    travel_category: string,
    locator_num: string,
    currency: string,
    total_cost: string,
    travel_property: string,
    start_date: string,
    end_date: string,
    additionalTravelers: Record<string, string>[],
}

// The single source of truth for what "extractionMode isn't set yet" means -- App.tsx's
// switch and index.ts's content script both read this instead of guessing their own
// fallback, so they can't silently disagree with each other again.
export const DEFAULT_EXTRACTION_MODE: AppStorageSchema["extractionMode"] = "dom"

// What DOM-mode reads via CSS selectors and what Claude-mode asks Claude to extract
// instead. See buildExtractionPrompt in logic/claude.ts. Deliberately excludes the
// resCard/reservation/traveler fields above -- those aren't captured per-page, they're
// read straight out of localStore in generate.ts.
export type PageDataSchema = PageDataFields

// TS types don't exist at runtime, so there's no way to hand PageDataSchema itself to
// Claude -- this is the runtime companion that actually describes each field, kept in sync
// with PageDataSchema via `key: keyof PageDataSchema` (a typo or removed field here is a
// compile error, a field missing here entirely is not, since arrays can't be checked for
// completeness against an object type).
export const PAGE_FIELDS: { key: keyof PageDataSchema; description: string }[] = [
    { key: "confirmationNumber", description: "Confirmation number" },
    { key: "resortName", description: "Hotel or resort name" },
    { key: "checkInDate", description: "Check-in date" },
    { key: "checkOutDate", description: "Check-out date" },
    { key: "odenzaPrice", description: "Cost of the resort to be paid, excludes at resort fees" },
    { key: "paymentCurrency", description: "Payment currency -- either USD or CAD" },
]

// Storage engine contract, generic over a key->value schema. Swapping the engine later
// (e.g. to IndexedDB) means writing another createLocalStore-shaped factory and changing
// the export at the bottom, with no call site needing to change.
export interface LocalStore<Schema> {
    get<K extends keyof Schema & string>(key: K): Promise<Schema[K] | undefined>
    set<K extends keyof Schema & string>(key: K, value: Schema[K]): Promise<void>
    remove(key: keyof Schema & string): Promise<void>
}

// Schema is pinned here once via the type argument at the call site below, so nothing
// calling localStore.get/set ever has to name it again.
function createLocalStore<Schema>(): LocalStore<Schema> {
    return {
        async get<K extends keyof Schema & string>(key: K): Promise<Schema[K] | undefined> {
            const stored = await chrome.storage.local.get(key)
            return stored[key] as Schema[K] | undefined
        },

        async set<K extends keyof Schema & string>(key: K, value: Schema[K]): Promise<void> {
            await chrome.storage.local.set({ [key]: value })
        },

        async remove(key: keyof Schema & string): Promise<void> {
            await chrome.storage.local.remove(key)
        },
    }
}

export const localStore = createLocalStore<AppStorageSchema>()
