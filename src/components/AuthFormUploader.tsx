import { useState } from 'react'
import mockAuthForm from '../data/mock-auth-form.json'

export default function AuthFormUploader() {

  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<Object | null>(null)

  function handleFileChange (e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  async function handleUpload() {
    setData(mockAuthForm)
  }

  return(
    <>
    {data ? (
      <div className="data-display">
        <p>Data loaded successfully!</p>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    ) : (
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
  )}
  </>
  )
}