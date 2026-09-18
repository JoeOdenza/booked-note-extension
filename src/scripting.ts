export async function getActiveTab(): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab
}

// Sets an input's value on the page and fires the events the page's own JS listens for.
// Uses the native value setter instead of `el.value =` directly, since some frameworks
// (React, or ASP.NET's own postback wiring) override the plain setter and won't notice a raw assignment.
function fillValue(selector: string, value: string | number): boolean {
    const el = document.querySelector(selector) as HTMLInputElement | null
    if (!el) return false

    const proto = Object.getPrototypeOf(el)
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
    if (nativeSetter) {
        nativeSetter.call(el, value)
    } else {
        el.value = String(value)
    }

    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
    return true
}


async function setInputValue(tabId: number, selector: string, value: string | number) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: fillValue,
        args: [selector, value]
    })

    return result
}

// Same as fillValue, but also fires blur -- AjaxControlToolkit's CalendarExtender (the
// "odd looking" popup calendar on this page) reformats/validates the textbox on focus-loss,
// so without blur the raw value can stick but not get picked up as a "real" selected date.
function fillDate(selector: string, value: string): boolean {
    const el = document.querySelector(selector) as HTMLInputElement | null
    if (!el) return false

    const proto = Object.getPrototypeOf(el)
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
    if (nativeSetter) {
        nativeSetter.call(el, value)
    } else {
        el.value = value
    }

    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
    el.dispatchEvent(new Event("blur", { bubbles: true }))
    return true
}

async function setDateValue(tabId: number, selector: string, value: string) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: fillDate,
        args: [selector, value]
    })

    await waitForTabIdle(tabId)

    return result
}

// matchBy: "value" matches <option value="...">, "text" matches the option's visible label
function fillSelect(selector: string, value: string, matchBy: "value" | "text"): boolean {
    const el = document.querySelector(selector) as HTMLSelectElement | null
    if (!el) return false

    let resolvedValue = value
    if (matchBy === "text") {
        const option = Array.from(el.options).find((o) => o.text.trim() === value)
        if (!option) return false
        resolvedValue = option.value
    }

    const proto = Object.getPrototypeOf(el)
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set
    if (nativeSetter) {
        nativeSetter.call(el, resolvedValue)
    } else {
        el.value = resolvedValue
    }

    el.dispatchEvent(new Event("change", { bubbles: true }))
    return true
}

async function setSelectValue(tabId: number, selector: string, value: string, matchBy: "value" | "text" = "value") {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: fillSelect,
        args: [selector, value, matchBy]
    })

    // Some dropdowns on this page trigger a real ASP.NET postback (full reload) on change,
    // not just an AJAX partial update. If we move on to the next field immediately, that
    // reload can finish afterward and wipe out whatever we just set. Give it a moment to
    // settle before returning control to the caller.
    await waitForTabIdle(tabId)

    return result
}

// el.click() does the full native sequence (sets checked, unchecks the rest of the
// radio group, fires click then change) -- unlike text/select values, there's no need
// for the native-setter trick here since clicking is already the "real" way to do this.
function pickRadio(selector: string): boolean {
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) return false

    el.click()
    return true
}

async function setRadioChecked(tabId: number, selector: string) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: pickRadio,
        args: [selector]
    })

    await waitForTabIdle(tabId)

    return result
}

// Resolves once the tab finishes reloading (if a postback triggered one), or after
// timeoutMs if nothing was loading in the first place -- most fields won't cause a reload.
function waitForTabIdle(tabId: number, timeoutMs = 1500): Promise<void> {
    return new Promise((resolve) => {
        let settled = false

        function finish() {
            if (settled) return
            settled = true
            chrome.tabs.onUpdated.removeListener(onUpdated)
            clearTimeout(timer)
            resolve()
        }

        function onUpdated(updatedTabId: number, info: chrome.tabs.OnUpdatedInfo) {
            if (updatedTabId === tabId && info.status === "complete") {
                finish()
            }
        }

        chrome.tabs.onUpdated.addListener(onUpdated)
        const timer = setTimeout(finish, timeoutMs)
    })
}


export const FULFILLMENT_TYPE = {
    RCI: "RCI",
    DIAMOND: "Diamond",
    REGULAR: "Regular"
} as const;

export const PAYMENT_CURRENCY = {
    USD: "USD",
    CAD: "CAD"
} as const;

export type FulfillmentType = typeof FULFILLMENT_TYPE[keyof typeof FULFILLMENT_TYPE]
export type PaymentCurrency = typeof PAYMENT_CURRENCY[keyof typeof PAYMENT_CURRENCY]

interface FillBookedNoteArgs {
    profitAndLoss: number | string
    fulfillmentType?: FulfillmentType
    paymentCurrency: PaymentCurrency
}

export async function fillBookedNote({
    profitAndLoss,
    fulfillmentType,
    paymentCurrency
}: FillBookedNoteArgs) {
    const tab = await getActiveTab();
    const tabId = tab.id!;
    const pnl = Number(profitAndLoss);

    await setInputValue(tabId, "#txtBookingPL", pnl);
    await setInputValue(tabId, "#txtInHouseCharges", "123");

    if (pnl >= 0) {
        await setSelectValue(tabId, "#dropBookingFulfillment", "NO", "text");
    } else if (pnl < 0) {
        await setSelectValue(tabId, "#dropBookingFulfillment", "YES", "text");
        await setSelectValue(tabId, "#dropfulfillmentType", fulfillmentType ?? "", "text");
    } else {
        console.log("Invalid profitAndLoss found")
    }

    await setSelectValue(tabId, "#grdVendor_ctl02_drpCurrVendor", paymentCurrency, "text");
    await setSelectValue(tabId, "#grdVendor_ctl02_drpPayment", "1", "text");
    await setRadioChecked(tabId, "#grdVendor_ctl02_grdPayment_ctl02_radCardType_6");
    await setSelectValue(tabId, "#grdVendor_ctl02_grdPayment_ctl02_drpCurr", paymentCurrency, "text");

    await setDateValue(tabId, "#grdVendor_ctl02_txtCreateDate", "06/06/2026")
}
