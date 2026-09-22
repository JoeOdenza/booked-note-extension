import { localStore } from "./logic/storage";
import type { PageCapturedMessage } from "./types";

// With no default_popup, clicking the toolbar icon opens the side panel instead
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((message: PageCapturedMessage) => {
  if (message.type !== "PAGE_CAPTURED") return;
  const {
    checkInDate,
    checkOutDate,
    confirmationNumber,
    odenzaPrice,
    paymentCurrency,
    resortName,
  } = message.info;

  localStore.set("checkInDate", checkInDate);
  localStore.set("checkOutDate", checkOutDate);
  localStore.set("confirmationNumber", confirmationNumber);
  localStore.set("odenzaPrice", odenzaPrice);
  localStore.set("paymentCurrency", paymentCurrency);
  localStore.set("resortName", resortName);
});
