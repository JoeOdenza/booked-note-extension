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

  const groupCodeRaw = document.querySelector(
    "#pnlCard > table > tbody > tr:nth-child(4) > td:nth-child(2)",
  );
  const groupCode = groupCodeRaw?.textContent?.trim()!;
  const profitAndLossText =
    document.querySelector("#txtBookingPL")?.textContent!;

  const totalFareElements =
    document.querySelectorAll<HTMLInputElement>('[id*="TotalFare"]');
  const supplierAmounts = Array.from(totalFareElements, (elem) =>
    Number(elem.value),
  );

  const agentMarkupRaw = document.querySelector("#txtAgtMarkUp");
  const agentMarkup = agentMarkupRaw === null ? null : Number(agentMarkupRaw);

  const commAmtElements =
    document.querySelectorAll<HTMLInputElement>('[id*="CommAmt"]');
  const commAmounts = Array.from(commAmtElements, (elem) => Number(elem.value));

  return {
    certCode,
    certNum,
    profitAndLossText,
    groupCode,
    supplierAmounts,
    commAmounts,
    agentMarkup,
  };
}

function getExpectedValues(
  certCode: string,
  totalSupplierPaid: number,
  totalComission: number,
  totalCustomerPayment: number,
) {
  const bookingDiff = totalCustomerPayment - totalSupplierPaid;
  const profitAndLoss = bookingDiff + totalComission;

  let agentMarkup;
  if (bookingDiff >= 0) {
    agentMarkup = bookingDiff;
  } else {
    const leftOverComission = totalComission + bookingDiff;
    agentMarkup = Math.max(0, leftOverComission);
  }

  return {
    expectedProfitAndLoss: profitAndLoss,
    expectedAgentMarkup: agentMarkup,
    expectedGroupCode: lookupGroupCode(certCode),
  };
}

function main() {
  const pageData = extractPageData();

  const { expectedAgentMarkup, expectedGroupCode } = getExpectedValues(
    pageData.certCode,
    pageData.supplierAmounts.reduce((sum, n) => sum + n),
    pageData.commAmounts.reduce((sum, n) => sum + n),
    0,
  );

  if (expectedGroupCode !== pageData.groupCode) {
    // todo
  }

  if (
    expectedAgentMarkup !== 0 &&
    pageData.agentMarkup === expectedAgentMarkup
  ) {
    // todo
  }
}

main();
