import { useState } from 'react'
import { censorCardNumbers, verifyCensored, renderPdfPreviewImages, dataUrlToFile, type CensorCheckResult } from '../pdf-extract'
import { askClaudeWithImages } from '../logic/claude'
import type { AuthFormData } from '../types'

// Claude is told to reply with only a JSON object, but models occasionally
// wrap it in a ```json fence anyway -- strip that before parsing so a
// well-formed response doesn't get treated as a failure.
function parseClaudeJson(raw: string): AuthFormData | null {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

export default function AuthFormUploader() {

  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<AuthFormData | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [check, setCheck] = useState<CensorCheckResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [claudeError, setClaudeError] = useState<string | null>(null)

  function handleFileChange (e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0])
      setCheck(null)
      setData(null)
      setClaudeError(null)
    }
  }

  async function handleUpload() {
    if (!file) return
    setIsProcessing(true)
    try {
      const { file: outFile, matches } = await censorCardNumbers(file)
      const [checkResult, images] = await Promise.all([
        verifyCensored(outFile),
        renderPdfPreviewImages(outFile),
      ])
      setMatchCount(matches.length)
      setCheck(checkResult)
      setPreviewImages(images)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleAskClaude() {
    if (previewImages.length === 0) return
    setIsAsking(true)
    setClaudeError(null)
    try {
      const images = previewImages.map((src, i) => dataUrlToFile(src, `page-${i + 1}.png`))
      const result = await askClaudeWithImages(
          `Extract the following fields from this document (auth Form) and reply with only a JSON object, no other text. DO NOT MAKE ANYTHING UP — if you're unsure, return null.

          - "mainGuestName": the name of the primary/main guest on the booking (found at the top under the customer information section, e.g. "Guest Name: First Last"), as a string; null if not present
          - "guestProfileNumber": the guest profile number, found under customer information as "Guest Profile", as a number; null if not present
          - "travelAdvisor": the name of the travel advisor/agent, as a string; null if not present
          - "guestDetails": an array of objects, one per guest listed on the document, each with:
            - "firstName": the guest's first name, as a string
            - "middleName": the guest's middle name, as a string; null if not present
            - "lastName": the guest's last name, as a string
            - "birthdate": the guest's birthdate, as a string
            - "citizenship": the guest's citizenship, as a string
            - "basePrice": the guest's base price, as a string
            - "taxAmount": the guest's tax amount, as a string
            - "currencyType": the currency the guest's amounts are in, as a string
          - "grandTotal": the total amount the customer has paid, without the currency symbol, as a number; null if not present
          - "grandTotalCurrency": the currency of the grand total, as a string; null if not present
          - "finalPayment": the in-house payment amount by the guests, should be <= grandTotal, found right under grand total, as a number; null if not present
          - "finalPaymentCurrency": the currency in which the final payment, as a string; null if not present
          - "depositAmount": the deposit amount paid (usually labeled "USD Fund For Ce.."), without the currency symbol, as a number to two decimal places;
            null if not present
          - "depositCurrencyType": the currency of the deposit amount, as a string; null if not present,
          - "certificateCode": the code of the certificate used in the trip, found after "Your certificate", has a string of capital letters followed
              by a string of numbers, ex. ABCDEFG12345
          - "hasUsedBankPoints": boolean for if the guest used any ATB or TD bank points as part of their payment.
              If can't find anything related, return false, else return true`,
                  images,
      )
      const parsed = parseClaudeJson(result)
      if (parsed === null) {
        setClaudeError(`Claude's response wasn't valid JSON:\n\n${result}`)
      } else {
        setData(parsed)
      }
    } finally {
      setIsAsking(false)
    }
  }

  return(
    <>
    {check ? (
      <div className="data-display">
        <p style={{ color: check.clean ? 'green' : 'red' }}>
          {matchCount === 0
            ? 'No card numbers found -- nothing to censor.'
            : `Censored ${matchCount} card number match(es). ` +
              (check.clean
                ? 'Verified clean: no matches remain in the output PDF.'
                : `Warning: ${check.remainingMatches.length} match(es) still detected after censoring.`)}
        </p>
        {previewImages.map((src, i) => (
          <div key={i} style={{ marginTop: 8 }}>
            <img src={src} style={{ width: '100%', border: '1px solid #ccc' }} />
            <a
              href={src}
              download={`${file?.name.replace(/\.pdf$/i, '') ?? 'censored'}-page-${i + 1}.png`}
              className="submit"
              style={{ display: 'inline-block', marginTop: 4 }}
            >
              Save page {i + 1} image
            </a>
          </div>
        ))}
        <button
          onClick={handleAskClaude}
          className="submit"
          disabled={isAsking}
          style={{ marginTop: 8 }}
        >{isAsking ? 'Asking Claude...' : data ? 'Re-ask Claude' : 'Send censored images to Claude'}</button>
        {claudeError && (
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: 'red' }}>{claudeError}</pre>
        )}
        {data && (
          <>
            <p style={{ marginTop: 8 }}>Data loaded successfully!</p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}
      </div>
    ) : (
      <>
      <div className="input-group">
        <input id="file" type="file" accept="application/pdf" onChange={handleFileChange} />
      </div>
      {file && (
        <section>
          File details:
          <ul>
            <li>Name: {file.name}</li>
            <li>Type: {file.type}</li>
            <li>Size: {file.size} bytes</li>
          </ul>
        </section>
      )}

      {file && (
        <button
          onClick={handleUpload}
          className="submit"
          disabled={isProcessing}
        >{isProcessing ? 'Censoring...' : 'Upload a file'}</button>
      )}
    </>
  )}
  </>
  )
}