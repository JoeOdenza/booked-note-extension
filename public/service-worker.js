// With no default_popup, clicking the toolbar icon opens the side panel instead
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error))
