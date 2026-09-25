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
import { convertCurrency, computeExpected, fillBookedNote, FillBookedNoteArgs } from './scripting'
import type { PaymentCurrency } from './scripting'
import { Button } from './components/ui/button'

const CERT_CODE_PATTERN = /^[A-Z]+\d*$/

// Pulls the number out of a money string like "$1,180.50" or "2450.00"; blank or unparseable -> 0
function parseMoney(value: string | undefined): number {
  const num = Number((value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(num) ? num : 0
}

function humanize(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function App() {

  const [latest, setLatest] = useState<(PageEntry & { url: string }) | null>(null)
  
  // For Cert Code input
  const [certCode, setCertCode] = useState("")
  const isCertCodeValid = CERT_CODE_PATTERN.test(certCode)

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
    generateResCardData(isCertCodeValid ? certCode: undefined).then((result) => setResCardData(result.data))
  }, [certCode, isCertCodeValid])

  // Writes a user edit back into resCardData so it survives re-renders and is included in the export.
  // index picks the row for reservations / additionalTravelers; ignored for resCard
  const updateResCardField = (section: keyof ResCardData, key: string, value: string, index = 0) => {
    setResCardData((prev) => {
      if (!prev) return prev
      if (section === 'resCard') {
        return { ...prev, resCard: { ...prev.resCard, [key]: value } }
      }
      return {
        ...prev,
        [section]: prev[section].map((row, i) => (i === index ? { ...row, [key]: value } : row)),
      }
    })
  }

  const [depositAmount, setDepositAmount] = useState('100')
  const [inHouseAmount, setInHouseAmount] = useState('400')
  const [depositCurrency, setDepositCurrency] = useState<PaymentCurrency>('USD')
  const [inHouseCurrency, setInHouseCurrency] = useState<PaymentCurrency>('USD')

  const setIsClaudeWiLocal = (val: boolean) => {
    localStore.set('extractionMode', val ? 'claude' : 'dom').then(
      () => setIsClaude(val)
    )
  }

  // Wipes everything in chrome.storage.local, then rebuilds the res card from the now-empty store
  const handleReset = async () => {
    await localStore.clear()
    setLatest(null)
    setIsClaude(DEFAULT_EXTRACTION_MODE === 'claude')
    const result = await generateResCardData()
    setResCardData(result.data)
  }

  const site = latest ? findMatchingSite(latest.url) : undefined
  const fields = site ? Object.keys(site.extract) : []


  // Both come from the (possibly user-edited) first reservation, so edits flow into agent markup
  const comission = parseMoney(resCardData?.reservations[0]?.commission);
  const odenzaCost = parseMoney(resCardData?.reservations[0]?.total_cost);

  const supplierUSDArray = resCardData?.reservations.map((reservation) => Number(reservation.total_cost.substring(1,)))
  const commissionArray = resCardData?.reservations.map((reservation) => Number(reservation.commission.substring(1,)))
  const agentMarkupCurrency = "CAD"
  const depositPay = depositCurrency === "CAD" ? convertCurrency(Number(depositAmount), depositCurrency, "USD") : Number(depositAmount) 
  const inHousePay = inHouseCurrency === "CAD" ? convertCurrency(Number(inHouseAmount), depositCurrency, "USD") : Number(inHouseAmount) 
  const customerPaymentPreConversion = depositPay + inHousePay
  const customerPaymentCurrency = "USD"

  console.log(supplierUSDArray, commissionArray, customerPaymentPreConversion)


  const {
expectedAgentMarkup: agentMarkup,
expectedProfitAndLoss: profitAndLoss
  } = supplierUSDArray && commissionArray ? computeExpected(supplierUSDArray!, commissionArray!, agentMarkupCurrency, customerPaymentPreConversion, customerPaymentCurrency) : {
    expectedAgentMarkup: 0, expectedProfitAndLoss: 0
  };
  

  const commonData = {
    paymentCurrency: "USD" as const,
    depositAmount: Number(depositAmount),
    inHouseChargeAmount: Number(inHouseAmount),
    depositCurrency: depositCurrency,
    inHouseCurrency: inHouseCurrency
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
      {resCardData && <ResCardPanel data={resCardData} onFieldChange={updateResCardField}
        agentMarkup={Math.round(agentMarkup * 100) / 100}
        onReset={handleReset} certCode = {certCode} onCertCodeChange={setCertCode} isCertCodeValid={isCertCodeValid}/>}

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
            <select
              value = {depositCurrency}
              onChange={(e)=>setDepositCurrency(e.target.value as PaymentCurrency)}>
              <option>
                USD
              </option>
              <option>
                CAD
              </option>
            </select>
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
            <select
              value = {inHouseCurrency}
              onChange={(e)=>setInHouseCurrency(e.target.value as PaymentCurrency)}>
              <option>
                USD
              </option>
              <option>
                CAD
              </option>
            </select>
          </div>
        </div>
        <Button onClick={() => fillBookedNote(bookedNoteData)}>Fill Booked Note</Button>
      </div>
    </>
  )
}

export default App
