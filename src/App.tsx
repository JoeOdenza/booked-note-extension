import { useEffect, useState } from 'react'
import { findMatchingSite } from './site-config'
import { getPages } from './storage'
import type { PageEntry } from './types'
import AuthFormUploader from './components/AuthFormUploader'
import ResCardPanel from './components/ResCardPanel'
import { askClaude, askClaudeWithFile } from './logic/claude'
import { pageToPdf, base64ToFile, extractPageDataWithClaude } from './logic/reader'
import mockClaudeData from './data/mockClaudeData.json'
import { Switch } from './components/ui/switch'
import { localStore, DEFAULT_EXTRACTION_MODE } from './logic/storage'
import { fillBookedNote } from './scripting'

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

  const setIsClaudeWiLocal = (val: boolean) => {
    localStore.set('extractionMode', val ? 'claude' : 'dom').then(
      () => setIsClaude(val)
    )
  }

  const site = latest ? findMatchingSite(latest.url) : undefined
  const fields = site ? Object.keys(site.extract) : []


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
      <div style={{ width: 240, padding: 16 }}>
        <h1 style={{ fontSize: '1.1rem', margin: '0 0 8px' }}>Booked Note</h1>
        {latest ? (
          <div>
            {fields.map((field) => (
              <p key={field} style={{ margin: '4px 0' }}>
                {humanize(field)}: <strong>{String(latest[field] ?? '—')}</strong>
              </p>
            ))}
            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#666' }}>
              {new Date(latest.capturedAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem', color: '#666' }}>No captures yet</p>
        )}
        <button onClick={() => askClaude('give me a haiku').then(console.log)}>
          Ask Claude
        </button>
        <button onClick={() => pageToPdf().then(console.log)}>
          Print PDF Data
        </button>
        <button onClick={() => fillBookedNote({
          kind: "loss" ,
          paymentCurrency: "USD",
          lossAmount: 300,
          fulfillmentType: "RCI",
          depositAmount: 100,
          inHouseChargeAmount: 279.99
        })}>
          Fill booked note
        </button>
        <button
          onClick={async () => {
            const base64 = await pageToPdf()
            const file = base64ToFile(base64, 'page.pdf', 'application/pdf')
            const result = await askClaudeWithFile(
              'Describe this document and extract its information into JSON.',
              file,
            )
            console.log(result)
          }}
        >
          Describe PDF with Claude
        </button>
        <button onClick={() => extractPageDataWithClaude().then(console.log)}>
          Extract Page Data With Claude
        </button>
      </div>
      <AuthFormUploader />
      <ResCardPanel data={mockClaudeData}/>
    </>
  )
}

export default App
