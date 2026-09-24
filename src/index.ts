import resCardGroupType from "./data/resCardGroupTypes.json"

const GROUP_CODE_SELECTOR =
  "#pnlCard > table > tbody > tr:nth-child(4) > td:nth-child(2)";
const AGENT_MARKUP_SELECTOR = "#txtAgtMarkUp";
const PROFIT_AND_LOSS_SELECTOR = '#txtBookingPL'
const USD_TO_CAD_CURRENCY_RATE = 1.3

function extractPageData() {
  const params = Object.fromEntries(
    new URL(window.location.href).searchParams,
  ) as {
    PROFILENO: string;
    RESCARD: string;
    CERT: string;
  };

  const certCode = params.CERT?.match(/[A-Za-z]+/)?.[0]!;
  const certNum = Number(params.CERT?.match(/[0-9]+/)?.[0])!;

  const groupCodeRaw = document.querySelector(GROUP_CODE_SELECTOR);
  const groupCode = groupCodeRaw?.textContent?.trim()!;
  const profitAndLossText =
    document.querySelector<HTMLInputElement>("#txtBookingPL")?.value!;

  const allCurrencies =
    document.querySelectorAll<HTMLInputElement>('[id*="CurrVendor"]')
  const supplierCurrency = Array.from(allCurrencies, (elem) =>
    elem.value
  )

  const totalFareElements =
    document.querySelectorAll<HTMLInputElement>('[id*="TotalFare"]');
  const supplierAmountsPreConversion = Array.from(totalFareElements, (elem) =>
    Number(elem.value),
  );
  const supplierAmounts = supplierAmountsPreConversion.map((val, i) => {
    return convertCurrency(val, supplierCurrency[i], "USD")
  })

  const agentMarkupRaw = document.querySelector<HTMLInputElement>(AGENT_MARKUP_SELECTOR);
  const agentMarkup = agentMarkupRaw === null ? null : Number(agentMarkupRaw.value);

  const commAmtElements =
    document.querySelectorAll<HTMLInputElement>('[id*="CommAmt"]');
  const commAmountsPreConversion = Array.from(commAmtElements, (elem) => Number(elem.value));
  const commAmounts = commAmountsPreConversion.map((val, i) => {
    return convertCurrency(val, supplierCurrency[i], "USD")
  })

  return {
    certCode,
    certNum,
    profitAndLossText,
    groupCode,
    supplierAmounts,
    commAmounts,
    agentMarkup,
    allCurrencies
  };
}

// Converts currency between USD and CAD, returns original value if same From and To
function convertCurrency(value: number, currencyFrom: string, currencyTo: string): number {
  if (currencyFrom === currencyTo || currencyFrom === '0') {
    return value
  } else if (currencyTo === "USD") {
    return value/USD_TO_CAD_CURRENCY_RATE
  } else {
    return value * USD_TO_CAD_CURRENCY_RATE
  }
}

function getExpectedValues(
  certCode: string,
  totalSupplierPaid: number,
  totalCommission: number,
  totalCustomerPaymentPreConversion: number,
  totalCustomerPaymentCurrency: string
) {

  const totalCustomerPayment = convertCurrency(totalCustomerPaymentPreConversion, totalCustomerPaymentCurrency, "USD")
  const bookingDiff = totalCustomerPayment - totalSupplierPaid;
  const profitAndLoss = convertCurrency(bookingDiff + totalCommission, "USD", "CAD")

  let agentMarkup;
  if (bookingDiff >= 0) {
    agentMarkup = bookingDiff;
  } else {
    const leftOverComission = totalCommission + bookingDiff;
    if (leftOverComission >= 0) {
      agentMarkup = leftOverComission
    } else {
      agentMarkup = -totalCommission
    }
  }
  agentMarkup = convertCurrency(agentMarkup, "USD", "CAD")

  return {
    expectedProfitAndLoss: profitAndLoss,
    expectedAgentMarkup: agentMarkup,
    expectedGroupCode: lookupGroupCode(certCode),
  };
}

function main() {
  const pageData = extractPageData();

  const { expectedAgentMarkup, expectedGroupCode, expectedProfitAndLoss } = getExpectedValues(
    pageData.certCode,
    pageData.supplierAmounts.reduce((sum, n) => sum + n, 0),
    pageData.commAmounts.reduce((sum, n) => sum + n, 0),
    500,
    "USD",
  );

  console.log(expectedAgentMarkup, expectedGroupCode)


  // Group Type Check
  if (expectedGroupCode !== pageData.groupCode) {
    showBanner("groupCode", `Expected Group Type: ${expectedGroupCode}`)
    drawRedBox(GROUP_CODE_SELECTOR);
  }

  // Currency Check
  const missingCurrency = Array.from(pageData.allCurrencies).filter(elem => elem.value === '0')
  missingCurrency.forEach(elem => drawRedBox(elem))
  if (missingCurrency.length > 0) {
    showBanner("currencyMissing", `Currency not selected for ${missingCurrency.length} supplier(s)`)
  }
  
  // P&L Check
  if (!pageData.profitAndLossText || Number.isNaN(Number(pageData.profitAndLossText))) {
    drawRedBox(PROFIT_AND_LOSS_SELECTOR)
    if (missingCurrency.length === 0) {
      showBanner("profitAndLossNaN", `P&L value is not a valid number`)
    }
  } else if (expectedProfitAndLoss !== Number(pageData.profitAndLossText)) {
    drawRedBox(PROFIT_AND_LOSS_SELECTOR)
    if (missingCurrency.length === 0) {
      showBanner("profitAndLossMisMatch", `Expected P&L: ${expectedProfitAndLoss.toFixed(2)}`)
    }
  }

  // Agent Markup Check
  if (expectedAgentMarkup !== 0 && pageData.agentMarkup === null) {
    if (missingCurrency.length === 0) {
      showBanner("agentMarkupMissing", `Expected Agent Markup: ${expectedAgentMarkup.toFixed(2)}`)
    }
  }

  if (pageData.agentMarkup && pageData.agentMarkup !== expectedAgentMarkup) {
    if (missingCurrency.length === 0) {
      drawRedBox(AGENT_MARKUP_SELECTOR)
      showBanner("agentMarkupMismatch", `Expected Agent Markup: ${expectedAgentMarkup.toFixed(2)}`)
    }
  }

  console.log("This is profit " + pageData.profitAndLossText)
  console.log("expected", expectedProfitAndLoss)
}

let highlighted: HTMLElement[] = []

function clearAllHighlights() {
  highlighted.forEach((field) => {
    field.style.outline = ""
    field.style.outlineOffset = ""
  })
  highlighted = []
  hideAllBanners()
}

const BANNER_CONTAINER_ID = "bookednotes-banners"

// Fixed stack at the top of the page that holds one banner per check
function getBannerContainer(): HTMLElement {
  let container = document.getElementById(BANNER_CONTAINER_ID)

  if (!container) {
    container = document.createElement("div")
    container.id = BANNER_CONTAINER_ID
    Object.assign(container.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    })
    document.body.appendChild(container)
  }

  return container
}

// Each check gets its own banner, keyed so reruns reuse it instead of stacking duplicates.
// Banners are only shown/hidden via display (an attribute), so this doesn't
// retrigger the MutationObserver on every rerun
function showBanner(key: string, message: string) {
  const container = getBannerContainer()
  let banner = container.querySelector<HTMLElement>(`[data-banner-key="${key}"]`)

  if (!banner) {
    banner = document.createElement("div")
    banner.dataset.bannerKey = key
    Object.assign(banner.style, {
      padding: "10px 16px",
      background: "#c62828",
      color: "#fff",
      font: "bold 14px sans-serif",
      textAlign: "center",
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
    })
    container.appendChild(banner)
  }

  if (banner.textContent !== message)
    banner.textContent = message
  banner.style.display = "block"
}

function hideAllBanners() {
  document
    .querySelectorAll<HTMLElement>(`#${BANNER_CONTAINER_ID} > [data-banner-key]`)
    .forEach((banner) => (banner.style.display = "none"))
}

// Fields whose values feed into the checks in main()
const WATCHED_INPUTS_SELECTOR = `${AGENT_MARKUP_SELECTOR}, [id*="TotalFare"], [id*="CommAmt"], ${PROFIT_AND_LOSS_SELECTOR}, [id*="CurrVendor"]`;

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

// Styling of red box for a selector or an element
function drawRedBox(target: string | HTMLElement): boolean {
  const field =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target

  if (!field)
    return false

  field.style.outline = "3px solid red"
  field.style.outlineOffset = "2px"
  highlighted.push(field)
  return true
}

// Extracts certCode letters and checks for match in resCardGroupType.json
function lookupGroupCode(certCode: string) : string {

  const matchedGroupType = resCardGroupType.find((g) => g.Program === certCode)
  return matchedGroupType?.["Group Code"] ?? ""
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_SELECTOR") {
    sendResponse({ found: drawRedBox(message.selector) })
  }
})

main();
watchForChanges();
