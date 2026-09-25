import type { ResCardData } from "@/types"

const EXPORT_FOLDER = "ResCardData"

function buildFilename(data: ResCardData) {
  const id = data.resCard.locator_num || data.resCard.trip_name || "rescard"
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `${id}_${stamp}.json`.replace(/[^\w.-]/g, "_")
}

export function downloadAsJson(
  data: ResCardData,
  extra: Record<string, unknown> = {},
  filename = buildFilename(data),
) {
  const json = JSON.stringify({ ...data, ...extra, exportedAt: Date.now() }, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  // A path relative to Downloads -- Chrome creates the ResCardData folder if it doesn't exist
  chrome.downloads
    .download({
      url,
      filename: `${EXPORT_FOLDER}/${filename}`,
      conflictAction: "uniquify",
      saveAs: false,
    })
    .catch((err) => console.error("Res card export failed:", err))
    .finally(() => URL.revokeObjectURL(url))
}
