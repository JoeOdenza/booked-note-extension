import resCardGroupType from "./data/resCardGroupTypes.json"

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
  // const extractedCertCode = extractCertCode(data.params.certCodeAndNum)
  // console.log(extractedCertCode)
  // const groupType = getGroupType(extractedCertCode)
  // console.log(groupType)
}

main();



let highlighted: HTMLElement[] = []

function clearAllHighlights() {
  highlighted.forEach((field) => (field.style.outline = ""))
  highlighted = []
}


// Styling of red box for specified selector
function drawRedBox(selector: string): boolean {
  const field = document.querySelector<HTMLElement>(selector)

  if (!field)
    return false

  field.style.outline = "3px solid red"
  field.style.outlineOffset = "2px"
  return true
}

// Extracts cert code from cert code number
function extractCertCode(certCodeAndNumber: string): string {
  if (certCodeAndNumber) {
    const match = certCodeAndNumber.match(/^[^1-9]+/)
    if (match) {
      return match[0]
    }
  }
  return ""
}

function getGroupType(certCode: string) : string {
  
  const match = resCardGroupType.find((g) => g.Program === certCode)
  return match?.["Group Code"] ?? ""

}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_SELECTOR") {
    sendResponse({ found: drawRedBox(message.selector) })
  }
})

