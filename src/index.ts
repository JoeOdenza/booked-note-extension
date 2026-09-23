function extractPageData() {
  const params = Object.fromEntries(
    new URL(window.location.href).searchParams,
  ) as {
    PROFILENO: string;
    RESCARD: string;
    CERT: string;
  };

  const certCode = params.CERT?.match(/[A-Za-z]+/)?.[0];
  const certNum = Number(params.CERT?.match(/[0-9]+/)?.[0]);

  const groupCodeRaw = document.querySelector(
    "#pnlCard > table > tbody > tr:nth-child(4) > td:nth-child(2)",
  );
  const groupCode = groupCodeRaw?.textContent?.trim() ?? null;
  const profitAndLossText =
    document.querySelector("#txtBookingPL")?.textContent;

  const totalFareElements =
    document.querySelectorAll<HTMLInputElement>('[id*="TotalFare"]');
  const supplierAmounts = Array.from(totalFareElements, (elem) =>
    Number(elem.value),
  );

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
  const data = extractPageData();
  console.log(data);
}

main();
