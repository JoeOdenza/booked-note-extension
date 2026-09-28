// import type { QualifiedFieldKey } from "./schema";
// import type { StorageShape } from "./types";
import { act } from "react";
import groupNamesData from "./data/resCardGroupTypes.json";
import type { Expected, ResCardData } from "./types"

// Booked Note Selectors
const BOOKING_PL_SELECTOR = '#txtBookingPL'
const CHK_CALCULATION_VERIFIED = '#chkBookingPL'
const SELECT_HAS_FULFILLMENT_SELECTOR = '#dropBookingFulfillment'
const SELECT_FULFILLMENT_TYPE_SELECTOR = '#dropfulfillmentType'
const SELECT_BOOKING_TYPE_SELECTOR = '#dropBookingType'
const SELECT_ADD_GUEST_CC = '#drpgCC'
const GUESTS_TRAVELLING = '#txtTravellers'
const GUEST_PHONE_NUM = '#txtGuestPhoneNo'
const GUEST_EMAIL = '#txtGuestEmail'
const GUEST_EMAIL_SEND = '#txtRPTEmail'
const AGENT_MARKUP = '#txtAgtMarkUp'
const SELECT_AGENT_MARKUP_CURRENCY = '#drpCurrMark'
const IN_HOUSE_CHARGES_AND_DEPOSIT = '#txtInHouseCharges'
const SUPPLIER_TABLE = '#grdVendor > tbody'


// Supplier information selector, more than one set
const BASE_SELECT_SUPPLIER_CURRENCY = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_drpCurrVendor`
const BASE_ACTUAL_BOOKING_DATE = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_txtCreateDate`
const BASE_SELECT_GROSS_NET = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_drpNetGross`
const BASE_SELECT_ATTACH_INVOICE = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_drpAPropInvoice`
const BASE_BASE_AMOUNT = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_txtBaseAmt`
const BASE_TAX_AMOUNT = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_txtTaxAmt`
const BASE_COMMISSION_AMOUNT = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_txtCommAmt`
const BASE_TOTAL_AMOUNT = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_txtTotalFare`
const BASE_SELECT_PAYMENT_COUNT = (num: number): string => `#grdVendor_ctl${String(num).padStart(2, '0')}_drpPayment`

//Number of rows based on payment count
const BASE_PAYMENT_RADIO_SELECTION = (num: number, innerNum: number) => 
  `#grdVendor_ctl${String(num).padStart(2, '0')}_grdPayment_ctl${String(innerNum).padStart(2, '0')}_radCardType_6`
const BASE_PAYMENT_VALUE = (num: number, innerNum: number) => 
  `#grdVendor_ctl${String(num).padStart(2, '0')}_grdPayment_ctl${String(innerNum).padStart(2, '0')}_txtValue`
const BASE_SELECT_PAYMENT_CURRENCY = (num: number, innerNum: number) => 
  `#grdVendor_ctl${String(num).padStart(2, '0')}_grdPayment_ctl${String(innerNum).padStart(2, '0')}_drpCurr`
const BASE_PAYMENT_DATE  = (num: number, innerNum: number) => 
  `#grdVendor_ctl${String(num).padStart(2, '0')}_grdPayment_ctl${String(innerNum).padStart(2, '0')}_txtDate`

//Odenza Card Only
const BASE_SELECT_CARD_NAME = '#grdVendor_ctl02_grdPayment_ctl02_txtDate'

// Guest Card or Uplift Card Only
const BASE_LAST_FOUR_DIGITS = '#grdVendor_ctl02_grdPayment_ctl02_txtCardDigit'


// One row of res_card_group_names.json -- a lookup table from cert program code to the
// Res Card's Marketing Source/Group Code, exported (messily) straight from a spreadsheet, so
// most rows besides "Program" are blank filler rows that only exist to group the ones above them.
interface GroupNameEntry {
  Program: string;
  "Marketing Source": string;
  "Group Code": string;
  "Commission Tracker Category": string;
  Incentive: string;
}

const GROUP_NAME_ENTRIES = groupNamesData as GroupNameEntry[];
const USD_TO_CAD_CURRENCY_RATE = 1.3;

// Cert codes mix in numbers (e.g. batch/version digits) that aren't part of the program
// identifier itself, so only the letters are meaningful for matching against Program.
function lettersOnly(value: string): string {
  return value.replace(/[0-9]/g, "").trim().toUpperCase();
}

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Sets an input's value on the page and fires the events the page's own JS listens for.
// Uses the native value setter instead of `el.value =` directly, since some frameworks
// (React, or ASP.NET's own postback wiring) override the plain setter and won't notice a raw assignment.
function fillValue(selector: string, value: string | number | boolean): boolean {
  const el = document.querySelector(selector) as HTMLInputElement | null;
  if (!el) return false;

  if (el.type === "checkbox") {
  if (el.checked !== Boolean(value)) el.click();
    return true;
  }

  const proto = Object.getPrototypeOf(el);
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = String(value);
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

async function setInputValue(
  tabId: number,
  selector: string,
  value: string | number | boolean,
) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fillValue,
    args: [selector, value],
  });

  return result;
}

// Same as fillValue, but also fires blur -- AjaxControlToolkit's CalendarExtender (the
// "odd looking" popup calendar on this page) reformats/validates the textbox on focus-loss,
// so without blur the raw value can stick but not get picked up as a "real" selected date.
function fillDate(selector: string, value: string): boolean {
  const el = document.querySelector(selector) as HTMLInputElement | null;
  if (!el) return false;

  const proto = Object.getPrototypeOf(el);
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

async function setDateValue(tabId: number, selector: string, value: string) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fillDate,
    args: [selector, value],
  });

  await waitForTabIdle(tabId);

  return result;
}

// matchBy: "value" matches <option value="...">, "text" matches the option's visible label
function fillSelect(
  selector: string,
  value: string,
  matchBy: "value" | "text",
): boolean {
  const el = document.querySelector(selector) as HTMLSelectElement | null;
  if (!el) return false;

  let resolvedValue = value;
  if (matchBy === "text") {
    const option = Array.from(el.options).find((o) => o.text.trim() === value);
    if (!option) return false;
    resolvedValue = option.value;
  }

  const proto = Object.getPrototypeOf(el);
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, resolvedValue);
  } else {
    el.value = resolvedValue;
  }

  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

async function setSelectValue(
  tabId: number,
  selector: string,
  value: string,
  matchBy: "value" | "text" = "value",
) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fillSelect,
    args: [selector, value, matchBy],
  });

  // Dropdowns on this page trigger ASP.NET postbacks (partial or full) on change. If we
  // move on before it finishes, the next postback aborts it or its response wipes out
  // what we just set.
  await waitForTabIdle(tabId);

  return result;
}

// el.click() does the full native sequence (sets checked, unchecks the rest of the
// radio group, fires click then change) -- unlike text/select values, there's no need
// for the native-setter trick here since clicking is already the "real" way to do this.
function pickRadio(selector: string): boolean {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return false;

  el.click();
  return true;
}

async function setRadioChecked(tabId: number, selector: string) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: pickRadio,
    args: [selector],
  });

  await waitForTabIdle(tabId);

  return result;
}

// Resolves once the tab finishes reloading (if a postback triggered one), or after
// timeoutMs if nothing was loading in the first place -- most fields won't cause a reload.
function waitForTabIdle(tabId: number, timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    function finish() {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      resolve();
    }

    function onUpdated(updatedTabId: number, info: chrome.tabs.OnUpdatedInfo) {
      if (updatedTabId === tabId && info.status === "complete") {
        finish();
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
    const timer = setTimeout(finish, timeoutMs);
  });
}

// Count direct rows of supplier info grid
function countRows(selector: string): number {
  return Array.from(document.querySelectorAll(`${selector} > tr`))
    .filter((tr) => !tr.querySelector(":scope > th"))
    .length
}

async function getRowCount(tabId: number, selector: string): Promise<number> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: countRows,
    args: [selector],
  });
  return result ?? 0;
}

export const FULFILLMENT_TYPE = {
  RCI: "RCI",
  DIAMOND: "Diamond",
  REGULAR: "Regular",
} as const;

export const PAYMENT_CURRENCY = {
  USD: "USD",
  CAD: "CAD",
} as const;

export type FulfillmentType =
  (typeof FULFILLMENT_TYPE)[keyof typeof FULFILLMENT_TYPE];
export type PaymentCurrency =
  (typeof PAYMENT_CURRENCY)[keyof typeof PAYMENT_CURRENCY];

interface FillBookedNoteLossArgs {
  kind: "loss";
  lossAmount: number;
  fulfillmentType: FulfillmentType;
  paymentCurrency: PaymentCurrency;
  depositAmount: number;
  inHouseChargeAmount: number;
  depositCurrency: PaymentCurrency;
  inHouseCurrency: PaymentCurrency;
  expectedAgentMarkup: number;
  resCardData: ResCardData | null;
}

interface FillBookedNoteProfitArgs {
  kind: "profit";
  profitAmount: number;
  paymentCurrency: PaymentCurrency;
  depositAmount: number;
  inHouseChargeAmount: number;
  depositCurrency: PaymentCurrency;
  inHouseCurrency: PaymentCurrency;
  expectedAgentMarkup: number;
  resCardData: ResCardData | null;
}

export type FillBookedNoteArgs =
  | FillBookedNoteLossArgs
  | FillBookedNoteProfitArgs;

export async function fillBookedNote(args: FillBookedNoteArgs) {
  const paymentDate = "09-23-2026";
  const { paymentCurrency } = args;
  const tab = await getActiveTab();
  const tabId = tab.id!;

  const pnl =
    args.kind === "loss"
      ? -Math.abs(args.lossAmount)
      : Math.abs(args.profitAmount);

  // P&L Fill
  await setInputValue(tabId, `${BOOKING_PL_SELECTOR}`, Math.round(pnl * 100) / 100);
  await setInputValue(tabId, `${CHK_CALCULATION_VERIFIED}`, true)

  // In-house charges and certificate deposits fill in
  await setInputValue(
    tabId,
    `${IN_HOUSE_CHARGES_AND_DEPOSIT}`,
    `Deposit: $${args.depositAmount} ${args.depositCurrency} | In-House: $${args.inHouseChargeAmount} ${args.inHouseCurrency}`,
  );

  // Agent Markup and Currency Fill in
  await setInputValue(
    tabId,
    `${AGENT_MARKUP}`,
    args.expectedAgentMarkup.toFixed(2)
  );
  await setSelectValue(
    tabId,
    `${SELECT_AGENT_MARKUP_CURRENCY}`,
    "CAD",
  );

  // Supplier info loop, check for number of rows and fill in based off number
  const supplierRowCount = await getRowCount(tabId, SUPPLIER_TABLE);
  console.log("Supplier rows:", supplierRowCount);
  
  const actualInputRowCount = Math.round(supplierRowCount / 2)

  for(let i = 2; i < 2 + actualInputRowCount; i++) {
    await setSelectValue(tabId, BASE_SELECT_SUPPLIER_CURRENCY(i), "CAD")
    await setDateValue(tabId, BASE_ACTUAL_BOOKING_DATE(i), paymentDate)
    await setSelectValue(tabId, BASE_SELECT_GROSS_NET(i), "Gross", "text")
    await setSelectValue(tabId, BASE_SELECT_ATTACH_INVOICE(i), "YES")
    await setInputValue(tabId, BASE_BASE_AMOUNT(i), 330.21)
    await setInputValue(tabId, BASE_TAX_AMOUNT(i), 0)
    await setInputValue(tabId, BASE_COMMISSION_AMOUNT(i), 50)
    await setInputValue(tabId, BASE_TOTAL_AMOUNT(i), 330.21)
    await setSelectValue(tabId, BASE_SELECT_PAYMENT_COUNT(i), "1", "text")

    // Inner Payment
    for (let j = 2; j < 2 + 1; j++) {
      await setRadioChecked(tabId, BASE_PAYMENT_RADIO_SELECTION(i, j))
      await setInputValue(tabId, BASE_PAYMENT_VALUE(i, j), 330.21)
      await setSelectValue(tabId, BASE_SELECT_PAYMENT_CURRENCY(i, j), 'CAD')
      await setInputValue(tabId, BASE_PAYMENT_DATE(i, j), paymentDate)
    }
  }

  // Fulfillment exist check
  switch (args.kind) {
    case "loss": {
      const fulfillmentType = 'Diamond' as FulfillmentType
      await setSelectValue(tabId, `${SELECT_HAS_FULFILLMENT_SELECTOR}`, "YES", "text");
      await setSelectValue(
        tabId,
        `${SELECT_FULFILLMENT_TYPE_SELECTOR}`,
        fulfillmentType,
        "text",
      );
      if (fulfillmentType !== FULFILLMENT_TYPE.RCI)
        await setSelectValue(
          tabId,
          `${SELECT_BOOKING_TYPE_SELECTOR}`,
          'Vegas',
          "text",
        );
      break;
      }
    case "profit": {
      await setSelectValue(tabId, `${SELECT_HAS_FULFILLMENT_SELECTOR}`, "NO", "text");
      break;
    }
    default: {
      const exhaustive: never = args;
      throw new Error(
        `Unhandled fillBookedNote args: ${JSON.stringify(exhaustive)}`,
      );
    }
  }

  // Certificate Holder information
  await setInputValue(tabId, `${GUESTS_TRAVELLING}`, "JOE LIN, SIKIJ KARKI")
  await setInputValue(tabId, `${GUEST_PHONE_NUM}`, '604-888-8888')
  await setInputValue(tabId, `${GUEST_EMAIL}`, 'joe@odenza.com')
  await setInputValue(tabId, `${GUEST_EMAIL_SEND}`, 'joe@odenza.com')
}

// export function computeBookedNoteFields(
//   customerPayment: number,
//   odenzaCost: number,
//   commission: number,
// ) {
//   // Raw payment/cost difference before commission -- positive means the customer paid
//   // more than the cost, negative means a shortfall.
//   const diff = customerPayment - odenzaCost;

//   // Commission always factors into profit and loss, whichever way diff goes.
//   const profitAndLoss = diff + commission;

//   // On a shortfall, the markup is however much of that shortfall the commission can
//   // cover (negative): fully covered -> the shortfall itself, otherwise capped at
//   // -commission since that's all there is to cover it with.
//   const agentMarkup = diff >= 0 ? diff : -Math.min(Math.abs(diff), commission);

//   console.log("computing");
//   console.log({
//     odenzaCost,
//     commission,
//     customerPayment,
//     diff,
//     profitAndLoss,
//     agentMarkup,
//   });

//   return { profitAndLoss, agentMarkup };
// }


// From booked-note-chcker
export function computeExpected(
  supplierAmountsUsd: number[], 
  commAmountsUsd: number[], 
  agentMarkupCurrency: string, 
  totalCustomerPayment: number): Expected {
    const totalSupplierPaid = supplierAmountsUsd.reduce(
    (sum, n) => sum + n,
    0,
    );
    const totalCommission = commAmountsUsd.reduce(
      (sum, n) => sum + n,
      0,
    );

    const bookingDiff = totalCustomerPayment - totalSupplierPaid;
    const expectedProfitAndLoss = convertCurrency(
      bookingDiff + totalCommission,
      "USD",
      "CAD",
    );

    let expectedAgentMarkupUsd: number;
    if (bookingDiff >= 0) {
      expectedAgentMarkupUsd = bookingDiff;
    } else {
      const leftOverCommission = totalCommission + bookingDiff;
      expectedAgentMarkupUsd =
        leftOverCommission >= 0 ? leftOverCommission : -totalCommission;
    }
    const expectedAgentMarkup = convertCurrency(
      expectedAgentMarkupUsd,
      "USD",
      agentMarkupCurrency ?? "CAD",
    );

    return {expectedProfitAndLoss, expectedAgentMarkup}
  }

  // Converts currency between USD and CAD, returns original value if same From and To
export function convertCurrency(
  value: number,
  currencyFrom: string,
  currencyTo: string,
): number {
  if (currencyFrom === currencyTo || currencyFrom === "0") {
    return value;
  } else if (currencyTo === "USD") {
    return value / USD_TO_CAD_CURRENCY_RATE;
  } else {
    return value * USD_TO_CAD_CURRENCY_RATE;
  }
}

// Rounds to the nearest cent so accumulated float error (e.g. from repeated
// currency conversion) doesn't make an otherwise-matching value fail a `!==` check
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}