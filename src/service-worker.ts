import type { PageCapturedMessage } from "./types"
import { savePage } from "./storage"

// With no default_popup, clicking the toolbar icon opens the side panel instead
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))

chrome.runtime.onMessage.addListener((message: PageCapturedMessage) => {
    if (message.type !== "PAGE_CAPTURED") return;
    savePage(message.url, message.info);

    console.log('mista white!');
})
