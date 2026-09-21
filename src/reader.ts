import { type SiteConfig, findMatchingSite } from './site-config'
import type { PageCapturedMessage } from './types'

function extractInfo(site: SiteConfig): Record<string, unknown> {
  const info: Record<string, unknown> = {}
  for (const [field, selector] of Object.entries(site.extract)) {
    const el = document.querySelector(selector)
    info[field] = el?.textContent?.trim() ?? null
  }
  return info
}

console.log('[booked-note] content script injected on', location.href)

const site = findMatchingSite(location.href)
console.log('[booked-note] matched site config:', site)

if (site) {
  const info = extractInfo(site)
  const message: PageCapturedMessage = { type: "PAGE_CAPTURED", url: location.href, info }
  chrome.runtime.sendMessage(message)
}
