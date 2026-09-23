import { findMatchingSite } from "./site-config";
import type { ContentScriptMessage } from "./types";
import { localStore, DEFAULT_EXTRACTION_MODE } from "./logic/storage";
import { extractPageDataFromDom } from "./logic/dom";

console.log("[booked-note] content script injected on", location.href);

const site = findMatchingSite(location.href);
console.log("[booked-note] matched site config:", site);

// Content scripts are bundled against an older target (no top-level await support), so the
// async work here needs its own IIFE instead of running at module scope.
async function run() {
  if (!site) return;

  const extractionMode =
    (await localStore.get("extractionMode")) ?? DEFAULT_EXTRACTION_MODE;
  console.log("extraction mode", extractionMode);

  switch (extractionMode) {
    case "claude":
      // chrome.tabs / chrome.debugger aren't available inside a content script -- ask the
      // privileged service worker to run Claude-mode extraction on this tab instead.
      chrome.runtime.sendMessage({
        type: "EXTRACT_CLAUDE",
      } satisfies ContentScriptMessage);
      break;

    case "dom": {
      const data = extractPageDataFromDom({
        confirmationNumber:
          "body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.res-information-container > div:nth-child(3) > p:nth-child(1) > span",
        resortName: "p.resort-name",
        checkInDate:
          "body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(4) > span",
        checkOutDate:
          "body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(5) > span",
        odenzaPrice:
          "body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-4 > div > div.trip-summary-container.js-trip-summary-container > div.summary-final-item > div.summary-final-item-amount",
        paymentCurrency:
          "body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div:nth-child(7)",
        tripLocation:
          "body > div.site-main-container.clearfix > div.main-contained-site > div > div.site-container > div > div.find-my-reservation.contained-item > div > div.col-lg-8 > div.column-left > div.trip-summary-container.js-trip-summary-container > div.summary-resort-details-container > p.resort-location"
      });

      chrome.runtime.sendMessage({
        type: "PAGE_DATA",
        data,
      } satisfies ContentScriptMessage);
      break;
    }

    default: {
      const _exhaustCheck: never = extractionMode;
      throw new Error(`Default case never allowed: ${_exhaustCheck}`);
    }
  }
}

run();
