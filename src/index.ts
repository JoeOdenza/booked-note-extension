function main() {
  drawRedBox("#lblBookingPL")
  console.log(window.location.href);
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

