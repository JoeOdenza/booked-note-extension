function extractPageData() {
  const params = Object.fromEntries(
    new URL(window.location.href).searchParams,
  ) as {
    profileNum: string;
    rescardNum: string;
    certCodeAndNum: string;
  };

  const groupCodeRaw = document.querySelector(
    "#pnlCard > table > tbody > tr:nth-child(4) > td:nth-child(2)",
  );
  const groupCode = groupCodeRaw?.textContent?.trim() ?? null;

  const totalFareElements =
    document.querySelectorAll<HTMLInputElement>('[id*="TotalFare"]');
  const supplierAmounts = Array.from(totalFareElements, (elem) =>
    Number(elem.value),
  );

  const commAmtElements =
    document.querySelectorAll<HTMLInputElement>('[id*="CommAmt"]');
  const commAmounts = Array.from(commAmtElements, (elem) => Number(elem.value));

  return { params, groupCode, supplierAmounts, commAmounts };
}

function main() {
  const data = extractPageData();
  console.log(data);
}

main();


// Styling of red box for specified selector
function drawRedBox(selector: string): boolean {
  const field = document.querySelector<HTMLElement>(selector)

  if (!field)
    return false

  field.style.outline = "3px solid red"
  field.style.outlineOffset = "2px"
  return true
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_SELECTOR") {
    sendResponse({ found: drawRedBox(message.selector) })
  }
})

