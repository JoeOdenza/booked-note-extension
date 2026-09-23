import { useEffect, useState } from 'react'
import { findMatchingSite } from './site-config'
import { getPages } from './storage'
import type { PageEntry, ResCardData } from './types'
import AuthFormUploader from './components/AuthFormUploader'
import ResCardPanel from './components/ResCardPanel'
import { askClaude, askClaudeWithFile } from './logic/claude'
import { pageToPdf, base64ToFile, extractPageDataWithClaude } from './logic/reader'
import { generateResCardData } from './logic/generate'
import { Switch } from './components/ui/switch'
import { localStore, DEFAULT_EXTRACTION_MODE } from './logic/storage'
import { computeBookedNoteFields, fillBookedNote, FillBookedNoteArgs } from './scripting'
import { Button } from './components/ui/button'

function humanize(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function App() {

  const [latest, setLatest] = useState<(PageEntry & { url: string }) | null>(null)

  useEffect(() => {
    getPages().then((pages) => {
      const entries = Object.entries(pages)
      if (entries.length === 0) return

      const [url, entry] = entries.reduce((newest, current) =>
        current[1].capturedAt > newest[1].capturedAt ? current : newest,
      )
      setLatest({ url, ...entry })
    })
  }, [])

  const [isClaude, setIsClaude] = useState(false);
  useEffect(() => {
    localStore.get('extractionMode').then((val) => setIsClaude((val ?? DEFAULT_EXTRACTION_MODE) === 'claude'))

  }, [])

  const [resCardData, setResCardData] = useState<ResCardData | null>(null)
  useEffect(() => {
    generateResCardData().then((result) => setResCardData(result.data))
  }, [])

  const [depositAmount, setDepositAmount] = useState('100')
  const [inHouseAmount, setInHouseAmount] = useState('400')

  const setIsClaudeWiLocal = (val: boolean) => {
    localStore.set('extractionMode', val ? 'claude' : 'dom').then(
      () => setIsClaude(val)
    )
  }

  const site = latest ? findMatchingSite(latest.url) : undefined
  const fields = site ? Object.keys(site.extract) : []


  const comission = 0;
  const odenzaCost = Number(resCardData?.reservations[0].total_cost.split('$')[1]);

  const {
agentMarkup,
profitAndLoss
  } = computeBookedNoteFields(Number(depositAmount) + Number(inHouseAmount), odenzaCost, comission);

  const commonData = {
    paymentCurrency: "USD" as const,
    depositAmount: Number(depositAmount),
    inHouseChargeAmount: Number(inHouseAmount),
  };

  const bookedNoteData: FillBookedNoteArgs = profitAndLoss >= 0
    ? {
        kind: "profit",
        profitAmount: profitAndLoss,
        ...commonData,
      }
    : {
        kind: "loss",
        lossAmount: Math.abs(profitAndLoss),
        fulfillmentType: "RCI",
        ...commonData,
      }; 


  return (
    <>
      <div className="flex items-center space-x-2">
        <Switch id="airplane-mode" checked={!isClaude} onCheckedChange={(isDom) => setIsClaudeWiLocal(!isDom)} />
        <span>DOM Mode</span>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="airplane-mode" checked={isClaude} onCheckedChange={(isClaude) => setIsClaudeWiLocal(isClaude)} />
        <span>Claude Mode</span>
      </div>
      <div style={{ width: 240, padding: 10 }}>
        <h1 style={{ fontSize: '1.1rem', margin: '0 0 0px' }}>Res Tracker</h1>
      </div>
      {resCardData && <ResCardPanel data={resCardData} agentMarkup={Math.round(agentMarkup * 100) / 100} />}

      <div className="flex flex-col gap-3 my-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Deposit</label>
            <input
              type="number"
              placeholder="Enter number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">In House Charge</label>
            <input
              type="number"
              placeholder="Enter number"
              value={inHouseAmount}
              onChange={(e) => setInHouseAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <Button onClick={() => fillBookedNote(bookedNoteData)}>Fill Booked Note</Button>
      </div>
    </>
  )
}

export default App
