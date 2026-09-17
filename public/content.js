(() => {
    if (window.__pickerContentLoaded) return
    window.__pickerContentLoaded = true

    const HIGHLIGHT_CLASS = 'picker-highlight'
    const style = document.createElement('style')

    //Create style element with class and highlight css
    style.textContent = `.${HIGHLIGHT_CLASS} { outline: 2px solid #ff5722 !important; cursor: crosshair !important; }`

    //Append it to the head of the document
    document.head.appendChild(style)

    let hovered = null
    let activeKey = null

    function onMouseOver(e) {
        //previous dom element, remove the highlight class when you mouse over something else
        if (hovered) {
            hovered.classList.remove(HIGHLIGHT_CLASS)
        }
        //e.target is set to new mouseover element
        hovered = e.target

        //Adds HIGHLIGHT_CLASS to the DOM element
        hovered.classList.add(HIGHLIGHT_CLASS)
    }

    function onClick(e) {
        e.preventDefault()
        e.stopPropagation()

        const target = e.target
        const value = target.innerText || target.textContent.trim()
        const selector = buildSelector(target)
        const key = activeKey

        cleanup()

        chrome.runtime.sendMessage({ type: "FIELD_PICKED", key, value, selector })
    }

    function startPicking(key) {
        cleanup()
        activeKey = key
        document.addEventListener("mouseover", onMouseOver, true)
        document.addEventListener("click", onClick, true)
    }

    function cleanup() {
        document.removeEventListener("mouseover", onMouseOver, true)
        document.removeEventListener("click", onClick, true)
        if (hovered) {
            hovered.classList.remove(HIGHLIGHT_CLASS)
            hovered = null
        }
        activeKey = null
    }

    // Builds a selector that can relocate this same element next time this layout is applied
    function buildSelector(el) {
        if (el.id) return `#${CSS.escape(el.id)}`

        const path = []
        while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
            if (el.id) {
                path.unshift(`#${CSS.escape(el.id)}`)
                break
            }

            let nth = 1
            let sibling = el
            while ((sibling = sibling.previousElementSibling)) {
                if (sibling.nodeName === el.nodeName) nth++
            }

            path.unshift(`${el.nodeName.toLowerCase()}:nth-of-type(${nth})`)
            el = el.parentElement
        }

        return path.join(" > ")
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "PICK_FIELD") {
            startPicking(message.key)
        }

        if (message.type === "APPLY_LAYOUT") {
            const results = {}
            for (const [key, selector] of Object.entries(message.layout)) {
                const el = document.querySelector(selector)
                if (el) {
                    results[key] = el.innerText || el.textContent.trim()
                }
            }
            chrome.runtime.sendMessage({ type: "LAYOUT_APPLIED", results })
        }
    })
})()
