import { useState } from "react"
import { Button } from "@/components/ui/button"
import { fillExpectedValues } from "@/logic/chrome"

export default function Popup() {
  const [status, setStatus] = useState<string | null>(null)

  async function handleFill() {
    try {
      const response = await fillExpectedValues()
      setStatus(response?.ok ? "Filled expected values" : (response?.error ?? "No response from page"))
    } catch {
      // sendMessage rejects when no content script is listening in the tab
      setStatus("Open a booking note page first")
    }
  }

  return <div className="flex w-64 flex-col gap-2 p-3">
    <Button onClick={handleFill}>Fill expected values</Button>
    {status && <p className="text-sm text-muted-foreground">{status}</p>}
  </div>
}
