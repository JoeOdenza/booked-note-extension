import resCardGroupType from "./data/resCardGroupTypes.json";

const GROUP_CODE_SELECTOR =
  "#pnlCard > table > tbody > tr:nth-child(4) > td:nth-child(2)";
const AGENT_MARKUP_SELECTOR = "#txtAgtMarkUp";
const AGENT_MARKUP_CURRENCY_SELECTOR = "#drpCurrMark";
const PROFIT_AND_LOSS_SELECTOR = "#txtBookingPL";
const IN_HOUSE_AND_CERT_DEPOSIT_SELECTOR = "#txtInHouseCharges";
const USD_TO_CAD_CURRENCY_RATE = 1.3;
const DEFAULT_CUSTOMER_PAYMENT = 500;
const DEFAULT_CUSTOMER_PAYMENT_CURRENCY = "USD";

// =============================================================================
// Layer 1: Extraction -- the only place that touches `document.*`. Resolves
// the page into one clean, fully-typed PageData, or a list of ExtractionErrors
// if something required is missing. Nothing past this layer sees a DOM node,
// `null`, or `undefined` again.
// =============================================================================

type PageData = {
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

type ExtractionError = { field: string; message: string };

type PageDataResult =
  | { ok: true; data: PageData }
  | { ok: false; errors: ExtractionError[] };

function getElementValue(selector: string): string | null {
  const elem = document.querySelector(selector);
  if (elem === null) return null;

  return elem instanceof HTMLInputElement || elem instanceof HTMLSelectElement
    ? elem.value
    : (elem.textContent?.trim() ?? null);
}

function getPageData(): PageDataResult {
  const errors: ExtractionError[] = [];

  const params = Object.fromEntries(
    new URL(window.location.href).searchParams,
  ) as {
    PROFILENO: string;
    RESCARD: string;
    CERT: string;
  };

  const certCode = params.CERT?.match(/[A-Za-z]+/)?.[0];
  if (certCode === undefined) {
    errors.push({
      field: "certCode",
      message: "CERT query param missing or malformed",
    });
  }

  const certNum = Number(params.CERT?.match(/[0-9]+/)?.[0]);
  if (Number.isNaN(certNum)) {
    errors.push({
      field: "certNum",
      message: "CERT query param missing or malformed",
    });
  }

  const groupCode = getElementValue(GROUP_CODE_SELECTOR);
  if (groupCode === null) {
    errors.push({
      field: "groupCode",
      message: `No element matching "${GROUP_CODE_SELECTOR}"`,
    });
  }

  const profitAndLossText = getElementValue(PROFIT_AND_LOSS_SELECTOR);
  if (profitAndLossText === null) {
    errors.push({
      field: "profitAndLossText",
      message: `No element matching "${PROFIT_AND_LOSS_SELECTOR}"`,
    });
  }

  const currencyElements =
    document.querySelectorAll<HTMLInputElement>('[id*="CurrVendor"]');
  const supplierCurrency = Array.from(currencyElements, (elem) => elem.value);
  const missingCurrencyElements = Array.from(currencyElements).filter(
    (elem) => elem.value === "0",
  );

  const totalFareElements =
    document.querySelectorAll<HTMLInputElement>('[id*="TotalFare"]');
  const supplierAmountsUsd = Array.from(totalFareElements, (elem, i) =>
    convertCurrency(Number(elem.value), supplierCurrency[i], "USD"),
  );

  const commAmtElements =
    document.querySelectorAll<HTMLInputElement>('[id*="CommAmt"]');
  const commAmountsUsd = Array.from(commAmtElements, (elem, i) =>
    convertCurrency(Number(elem.value), supplierCurrency[i], "USD"),
  );

  const agentMarkupText = getElementValue(AGENT_MARKUP_SELECTOR);
  const agentMarkup = agentMarkupText === null ? null : Number(agentMarkupText);

  const agentMarkupCurrency = getElementValue(AGENT_MARKUP_CURRENCY_SELECTOR);
  const missingMarkupCurrency = agentMarkupCurrency === "0";

  const inHouseChargeAndCertDeposit = getElementValue(
    IN_HOUSE_AND_CERT_DEPOSIT_SELECTOR,
  );
  if (inHouseChargeAndCertDeposit === null) {
    errors.push({
      field: "inHouseChargeAndCertDeposit",
      message: `No element matching "${IN_HOUSE_AND_CERT_DEPOSIT_SELECTOR}"`,
    });
  }

  const [inHouseCharge, certificateDeposit] = inHouseChargeAndCertDeposit!
    ?.split(",")
    .map((val_with_curr) => {
      if (val_with_curr.includes("USD")) {
        console.log(val_with_curr.split("USD")[0].trim());
        return Number(val_with_curr.split("USD")[0].trim());
      }

      return convertCurrency(
        Number(val_with_curr.split("CAD")[0].trim()),
        "CAD",
        "USD",
      );
    });

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      certCode: certCode!,
      certNum,
      groupCode: groupCode!,
      profitAndLossText: profitAndLossText!,
      missingCurrencyElements,
      supplierAmountsUsd,
      commAmountsUsd,
      agentMarkup,
      agentMarkupCurrency,
      missingMarkupCurrency,
      inHouseCharge,
      certificateDeposit,
    },
  };
}

// =============================================================================
// Layer 2: Comparison -- pure functions, no DOM, no chrome APIs. Turns a
// PageData into a list of Discrepancy records describing what doesn't match.
// =============================================================================

type Discrepancy =
  | { kind: "groupCodeMismatch"; expected: string }
  | { kind: "currencyMissing"; elements: HTMLInputElement[] }
  | { kind: "profitAndLossInvalid" }
  | { kind: "profitAndLossMismatch"; expected: number }
  | { kind: "agentMarkupMissing"; expected: number }
  | { kind: "agentMarkupMismatch"; expected: number }
  | { kind: "agentMarkupCurrencyMissing" };

type Expected = { expectedProfitAndLoss: number, expectedAgentMarkup: number}


// Rounds to the nearest cent so accumulated float error (e.g. from repeated
// currency conversion) doesn't make an otherwise-matching value fail a `!==` check
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// Converts currency between USD and CAD, returns original value if same From and To
function convertCurrency(
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

// Extracts certCode letters and checks for match in resCardGroupType.json
function lookupGroupCode(certCode: string): string {
  const matchedGroupType = resCardGroupType.find((g) => g.Program === certCode);
  return matchedGroupType?.["Group Code"] ?? "";
}

function computeExpected(
  pageData: PageData, 
  customerPaymentPreConversion: number, 
  customerPaymentCurrency: string): Expected {
    const totalSupplierPaid = pageData.supplierAmountsUsd.reduce(
    (sum, n) => sum + n,
    0,
    );
    const totalCommission = pageData.commAmountsUsd.reduce(
      (sum, n) => sum + n,
      0,
    );
    const totalCustomerPayment = convertCurrency(
      customerPaymentPreConversion,
      customerPaymentCurrency,
      "USD",
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
      pageData.agentMarkupCurrency ?? "CAD",
    );

    return {expectedProfitAndLoss, expectedAgentMarkup}
  }

function compareToExpected(
  pageData: PageData,
  customerPaymentPreConversion: number,
  customerPaymentCurrency: string,
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  const {expectedProfitAndLoss, expectedAgentMarkup} = computeExpected(pageData, customerPaymentPreConversion, customerPaymentCurrency)

  if (pageData.missingMarkupCurrency) {
    discrepancies.push({ kind: "agentMarkupCurrencyMissing" });
  }

  const expectedGroupCode = lookupGroupCode(pageData.certCode);

  if (expectedGroupCode !== pageData.groupCode) {
    discrepancies.push({
      kind: "groupCodeMismatch",
      expected: expectedGroupCode,
    });
  }

  if (pageData.missingCurrencyElements.length > 0) {
    discrepancies.push({
      kind: "currencyMissing",
      elements: pageData.missingCurrencyElements,
    });
  }

  if (
    !pageData.profitAndLossText ||
    Number.isNaN(Number(pageData.profitAndLossText))
  ) {
    discrepancies.push({ kind: "profitAndLossInvalid" });
  } else if (
    roundCents(expectedProfitAndLoss) !==
    roundCents(Number(pageData.profitAndLossText))
  ) {
    discrepancies.push({
      kind: "profitAndLossMismatch",
      expected: expectedProfitAndLoss,
    });
  }

  if (expectedAgentMarkup !== 0 && pageData.agentMarkup === null) {
    discrepancies.push({
      kind: "agentMarkupMissing",
      expected: expectedAgentMarkup,
    });
  }

  if (
    pageData.agentMarkup &&
    roundCents(pageData.agentMarkup) !== roundCents(expectedAgentMarkup)
  ) {
    discrepancies.push({
      kind: "agentMarkupMismatch",
      expected: expectedAgentMarkup,
    });
  }

  return discrepancies;
}

// =============================================================================
// Layer 3: Reporting -- the only place (besides getPageData) that touches
// `document.*`/chrome APIs. Turns Discrepancy[] into red boxes and banners.
// =============================================================================

let highlighted: HTMLElement[] = [];

function clearAllHighlights() {
  highlighted.forEach((field) => {
    field.style.outline = "";
    field.style.outlineOffset = "";
  });
  highlighted = [];
  hideAllBanners();
}

const BANNER_CONTAINER_ID = "bookednotes-banners";

// Fixed stack at the top of the page that holds one banner per check
function getBannerContainer(): HTMLElement {
  let container = document.getElementById(BANNER_CONTAINER_ID);

  if (!container) {
    container = document.createElement("div");
    container.id = BANNER_CONTAINER_ID;
    Object.assign(container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    });
    document.body.appendChild(container);
  }

  return container;
}

// Each check gets its own banner, keyed so reruns reuse it instead of stacking duplicates.
// Banners are only shown/hidden via display (an attribute), so this doesn't
// retrigger the MutationObserver on every rerun
function showBanner(key: string, message: string) {
  const container = getBannerContainer();
  let banner = container.querySelector<HTMLElement>(
    `[data-banner-key="${key}"]`,
  );

  if (!banner) {
    banner = document.createElement("div");
    banner.dataset.bannerKey = key;
    Object.assign(banner.style, {
      padding: "10px 16px",
      background: "#c62828",
      color: "#fff",
      font: "bold 14px sans-serif",
      textAlign: "center",
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
    });
    container.appendChild(banner);
  }

  if (banner.textContent !== message) banner.textContent = message;
  banner.style.display = "block";
}

function hideAllBanners() {
  document
    .querySelectorAll<HTMLElement>(
      `#${BANNER_CONTAINER_ID} > [data-banner-key]`,
    )
    .forEach((banner) => (banner.style.display = "none"));
}

// Styling of red box for a selector or an element
function drawRedBox(target: string | HTMLElement): boolean {
  const field =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;

  if (!field) return false;

  field.style.outline = "3px solid red";
  field.style.outlineOffset = "2px";
  highlighted.push(field);
  return true;
}

function setInputValue(selector: string, value: number) {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) return false;
  input.value = value.toFixed(2);
  // Setting .value in code fires no events. Dispatch them so the page's own
  // onchange handlers run, and so our "input" listener calls rerun().
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function fillExpectedValues(expected: Expected) {
  setInputValue(AGENT_MARKUP_SELECTOR, expected.expectedAgentMarkup);
  setInputValue(PROFIT_AND_LOSS_SELECTOR, expected.expectedProfitAndLoss);
}

// Renders each discrepancy as a red box and/or banner. Once a currency is
// unresolved the numeric expectations below are unreliable, so their banners
// are suppressed -- the fields are still outlined, just without a (possibly
// misleading) "expected X" claim.
function reportDiscrepancies(discrepancies: Discrepancy[]) {
  const hasMissingCurrency = discrepancies.some(
    (d) => d.kind === "currencyMissing",
  );
  const hasMissingMarkupCurrency = discrepancies.some(
    (d) => d.kind === "agentMarkupCurrencyMissing",
  );

  for (const discrepancy of discrepancies) {
    switch (discrepancy.kind) {
      case "groupCodeMismatch":
        drawRedBox(GROUP_CODE_SELECTOR);
        showBanner("groupCode", `Expected Group Type: ${discrepancy.expected}`);
        break;

      case "currencyMissing":
        discrepancy.elements.forEach((elem) => drawRedBox(elem));
        showBanner(
          "currencyMissing",
          `Currency not selected for ${discrepancy.elements.length} supplier(s)`,
        );
        break;

      case "profitAndLossInvalid":
        drawRedBox(PROFIT_AND_LOSS_SELECTOR);
        if (!hasMissingCurrency) {
          showBanner("profitAndLossNaN", `P&L value is not a valid number`);
        }
        break;

      case "profitAndLossMismatch":
        drawRedBox(PROFIT_AND_LOSS_SELECTOR);
        if (!hasMissingCurrency) {
          showBanner(
            "profitAndLossMisMatch",
            `Expected P&L: ${discrepancy.expected.toFixed(2)}`,
          );
        }
        break;

      case "agentMarkupMissing":
        if (!hasMissingCurrency && !hasMissingMarkupCurrency) {
          showBanner(
            "agentMarkupMissing",
            `Expected Agent Markup: ${discrepancy.expected.toFixed(2)}`,
          );
        }
        break;

      case "agentMarkupMismatch":
        drawRedBox(AGENT_MARKUP_SELECTOR);
        if (!hasMissingCurrency && !hasMissingMarkupCurrency) {
          showBanner(
            "agentMarkupMismatch",
            `Expected Agent Markup: ${discrepancy.expected.toFixed(2)}`,
          );
        }
        break;

      case "agentMarkupCurrencyMissing":
        drawRedBox(AGENT_MARKUP_CURRENCY_SELECTOR);
        showBanner(
          "agentMarkupCurrencyMissing",
          `Currency not selected for Agent Markup`,
        );
        break;

      default:
        // If this errors, a Discrepancy variant above isn't handled by any case.
        const exhaustive: never = discrepancy;
        throw new Error(`Unhandled discrepancy: ${JSON.stringify(exhaustive)}`);
    }
  }
}

// =============================================================================
// Orchestration + wiring
// =============================================================================

function main() {
  const result = getPageData();
  console.log(result);

  if (!result.ok) {
    showBanner(
      "extractionError",
      `Could not read page: ${result.errors.map((e) => e.message).join("; ")}`,
    );
    return;
  }

  const discrepancies = compareToExpected(
    result.data,
    result.data.certificateDeposit + result.data.inHouseCharge,
    DEFAULT_CUSTOMER_PAYMENT_CURRENCY,
  );
  reportDiscrepancies(discrepancies);
}

// Fields whose values feed into the checks in main()
const WATCHED_INPUTS_SELECTOR = `${AGENT_MARKUP_SELECTOR}, [id*="TotalFare"], [id*="CommAmt"], ${PROFIT_AND_LOSS_SELECTOR}, [id*="CurrVendor"], ${IN_HOUSE_AND_CERT_DEPOSIT_SELECTOR}, ${AGENT_MARKUP_CURRENCY_SELECTOR}`;

// Debounced so a burst of keystrokes / DOM changes only re-checks once
let rerunTimer: number | undefined;
function rerun() {
  clearTimeout(rerunTimer);
  rerunTimer = window.setTimeout(() => {
    clearAllHighlights();
    main();
  }, 150);
}

function watchForChanges() {
  // User typing in any watched input (delegated, so re-rendered inputs still count)
  document.addEventListener("input", (e) => {
    if ((e.target as HTMLElement).matches?.(WATCHED_INPUTS_SELECTOR)) {
      rerun();
    }
  });

  // Group code text changing, or the page swapping out elements.
  // Attributes are not observed, so our own outline styling won't retrigger this.
  const observer = new MutationObserver(rerun);
  observer.observe(document.querySelector("#pnlCard") ?? document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_SELECTOR") {
    sendResponse({ found: drawRedBox(message.selector) });
  }

  if (message.type === "FILL_EXPECTED_VALUES") {
    const result = getPageData();
    if (!result.ok) {
      sendResponse({
        ok: false,
        error: result.errors.map((e) => e.message).join("; "),
      });
      return;
    }

    // Expected values are computed from converted amounts, so they're wrong
    // while any currency is still unselected
    if (
      result.data.missingCurrencyElements.length > 0 ||
      result.data.missingMarkupCurrency
    ) {
      sendResponse({ ok: false, error: "Select all currencies first" });
      return;
    }

    fillExpectedValues(
      computeExpected(
        result.data,
        result.data.certificateDeposit + result.data.inHouseCharge,
        DEFAULT_CUSTOMER_PAYMENT_CURRENCY,
      ),
    );
    sendResponse({ ok: true });
  }
});

main();
watchForChanges();
