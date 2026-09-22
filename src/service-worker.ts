import { localStore, type PageDataSchema } from "./logic/storage";
import { extractPageDataWithClaude } from "./logic/reader";
import type { ContentScriptMessage } from "./types";
import { savePage } from "./storage";
import type { PageCapturedMessage } from "./types";

// With no default_popup, clicking the toolbar icon opens the side panel instead
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

function savePageData(data: PageDataSchema) {
  for (const [key, value] of Object.entries(data) as [
    keyof PageDataSchema,
    string,
  ][]) {
    console.log(key, value);
    localStore.set(key, value);
  }
}

chrome.runtime.onMessage.addListener(
  (message: ContentScriptMessage, sender) => {
    switch (message.type) {
      case "PAGE_DATA":
        savePageData(message.data);
        break;

      case "EXTRACT_CLAUDE": {
        const tabId = sender.tab?.id;
        if (tabId == null) return;
        extractPageDataWithClaude(tabId).then(savePageData);
        break;
      }
    }
  },
);
chrome.runtime.onMessage.addListener((message: PageCapturedMessage) => {
  if (message.type !== "PAGE_CAPTURED") return;
  savePage(message.url, message.info);
});
