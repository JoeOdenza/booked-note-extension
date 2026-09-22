// Every key this extension stores, and the type of value that lives under it. Add a new
// key here and every localStore.get/set call site gets autocomplete + type-checking for it --
// no runtime schema object needed, since keys only exist at the type level.
interface AppStorageSchema {
    confirmationNumber: string,
    hotel_name: string,
    check_in_date: string,
    check_out_date: string,
    to_pay_price: string,
    payment_currency: "USD" | "CAD",
    extractionMode: "claude" | "dom"
}

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
