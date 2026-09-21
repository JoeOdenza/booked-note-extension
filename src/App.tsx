import { useEffect, useState } from 'react'
import { findMatchingSite } from './site-config'
import { getPages } from './storage'
import type { PageEntry } from './types'
import AuthFormUploader from './components/AuthFormUploader'

function humanize(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
}

function AuthFormUploader() {

  const [file, setFile] = useState<File | null>(null)

  function handleFileChange (e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  async function handleUpload() {

  }

  return(
    <>
      <div className="input-group">
        <input id="file" type="file" onChange={handleFileChange} />
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
        >Upload a file</button>
      )}
    </>
  )
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

  const site = latest ? findMatchingSite(latest.url) : undefined
  const fields = site ? Object.keys(site.extract) : []

  return (
    <>
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
      </div>
      <AuthFormUploader />
    </>
  )
}

export default App
