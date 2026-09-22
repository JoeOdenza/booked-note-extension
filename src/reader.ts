import { type SiteConfig, findMatchingSite } from './site-config'
import type { PageCapturedMessage } from './types'
import { localStore } from './logic/storage'

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
  void (async () => {
    const extractionMode = await localStore.get('extractionMode') ?? "claude";
    switch (extractionMode) {
      case "claude":
        console.log('claude mode');
        break;

      case "dom": {
        const info = extractInfo(site)
        const message: PageCapturedMessage = { type: "PAGE_CAPTURED", url: location.href, info }
        chrome.runtime.sendMessage(message)
        break;
      }

      default: {
        const _exhaustCheck: never = extractionMode;
        throw new Error(`Default case never allowed: ${_exhaustCheck}`);
      }
    }
  })();
}
