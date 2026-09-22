import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

// Masked display format (1234XXXXXXXX5678 / 1234********5678), or a full
// 16-digit number with optional space/dash separators every 4 digits.
const CARD_REGEX = /\b(?:(?<masked>\d{4}[X*]{8}\d{4})|(?<full>\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}))\b/gi

export interface CardMatch {
    page: number // 1-indexed
    text: string
    rect: { x: number; y: number; width: number; height: number } // PDF coords, origin bottom-left
}

export interface CensorCheckResult {
    clean: boolean
    remainingMatches: CardMatch[]
}

function passesLuhnCheck(digitsOnly: string): boolean {
    let sum = 0
    let shouldDouble = false
    for (let i = digitsOnly.length - 1; i >= 0; i--) {
        let digit = Number(digitsOnly[i])
        if (shouldDouble) {
            digit *= 2
            if (digit > 9) digit -= 9
        }
        sum += digit
        shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
}

async function loadPdf(file: File) {
    const buffer = await file.arrayBuffer()
    return pdfjsLib.getDocument({ data: buffer }).promise
}

export async function extractPdfTextItems(file: File) {
    const pdf = await loadPdf(file)
    return pdf
}

// Walks every page's text content, joins it into one string, and maps regex
// matches back to the bounding box of the text items they span so we know
// where to draw over on the page.
export async function findCardNumbers(file: File): Promise<CardMatch[]> {
    const pdf = await loadPdf(file)
    const matches: CardMatch[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const content = await page.getTextContent()

        // Build a flat string plus a lookup of which item each character in
        // that string came from, so a regex match spanning multiple text
        // items (common -- pdfjs often splits runs mid-token) can still be
        // resolved back to page coordinates. A separator is inserted between
        // items so a match ending right where the next item starts (e.g. a
        // card number immediately followed by the next line's text, with no
        // whitespace in between) still gets a valid word boundary.
        let joined = ''
        const spans: { start: number; end: number; item: any }[] = []
        for (const item of content.items as any[]) {
            const start = joined.length
            joined += item.str
            spans.push({ start, end: joined.length, item })
            joined += ' '
        }

        for (const m of joined.matchAll(CARD_REGEX)) {
            const matchStart = m.index!
            const matchEnd = matchStart + m[0].length

            // Full (unmasked) matches get Luhn-validated to cut false
            // positives from booking/confirmation numbers. Masked matches
            // always pass through -- there aren't enough real digits left
            // to run Luhn on.
            if (m.groups?.full) {
                const digitsOnly = m.groups.full.replace(/\D/g, '')
                if (!passesLuhnCheck(digitsOnly)) continue
            }

            const overlapping = spans.filter(s => s.start < matchEnd && s.end > matchStart)
            if (overlapping.length === 0) continue

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const { item } of overlapping) {
                const [, , , , e, f] = item.transform
                minX = Math.min(minX, e)
                maxX = Math.max(maxX, e + item.width)
                minY = Math.min(minY, f)
                maxY = Math.max(maxY, f + item.height)
            }

            matches.push({ page: pageNum, text: m[0], rect: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } })
        }
    }

    return matches
}

// Rasterizes any page containing a card number match and blacks out the
// match on the raster, then swaps that page in the output PDF for the
// flattened image. This removes the underlying text entirely (not just a
// visual overlay) since a rasterized page has no text layer at all. Pages
// with no match are left as-is, still real/selectable text.
export async function censorCardNumbers(file: File): Promise<{ file: File; matches: CardMatch[] }> {
    const matches = await findCardNumbers(file)
    if (matches.length === 0) {
        return { file, matches }
    }

    const pdfDoc = await PDFDocument.load(await file.arrayBuffer())
    const pdf = await loadPdf(file)
    const pagesWithMatches = new Set(matches.map(m => m.page))

    for (const pageNum of pagesWithMatches) {
        const jsPage = await pdf.getPage(pageNum)
        const scale = 2 // render at higher resolution so the blackout is crisp
        const viewport = jsPage.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        // Canvas pixels default to transparent, and PDF pages don't
        // necessarily paint their own background -- without this, any area
        // the page doesn't explicitly draw on gets exported as transparent
        // and composites to black once embedded back into the output PDF.
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await jsPage.render({ canvas, canvasContext: ctx, viewport }).promise

        // pdfjs viewport coords have the origin top-left; PDF/pdf-lib coords
        // have it bottom-left, so flip Y. The box is padded a few points
        // past the matched text's own bounding box on every side, since
        // pdfjs's per-glyph metrics can run a hair tight and leave a sliver
        // of a character peeking out otherwise.
        const PAD = 3
        ctx.fillStyle = 'black'
        for (const match of matches.filter(m => m.page === pageNum)) {
            const x = (match.rect.x - PAD) * scale
            const y = viewport.height - (match.rect.y + match.rect.height + PAD) * scale
            const width = (match.rect.width + PAD * 2) * scale
            const height = (match.rect.height + PAD * 2) * scale
            ctx.fillRect(x, y, width, height)
        }

        const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) return reject(new Error('canvas.toBlob failed'))
                resolve(new Uint8Array(await blob.arrayBuffer()))
            }, 'image/png')
        })

        const png = await pdfDoc.embedPng(pngBytes)
        const { width, height } = jsPage.getViewport({ scale: 1 })
        const index = pageNum - 1
        pdfDoc.removePage(index)
        const newPage = pdfDoc.insertPage(index, [width, height])
        newPage.drawImage(png, { x: 0, y: 0, width, height })
    }

    const outBytes = await pdfDoc.save()
    const censoredFile = new File(
        [outBytes as BlobPart],
        file.name.replace(/\.pdf$/i, '') + '-censored.pdf',
        { type: 'application/pdf' },
    )

    return { file: censoredFile, matches }
}

// Renders every page of the file to a PNG data URL. Chrome's built-in PDF
// viewer plugin isn't available inside an extension page (an <embed type=
// "application/pdf"> just renders solid black there), so previewing a PDF
// in the side panel means rasterizing it ourselves with pdfjs and showing
// plain <img> elements instead.
export async function renderPdfPreviewImages(file: File, scale = 1.5): Promise<string[]> {
    const pdf = await loadPdf(file)
    const images: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const jsPage = await pdf.getPage(pageNum)
        const viewport = jsPage.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        await jsPage.render({ canvas, canvasContext: ctx, viewport }).promise

        images.push(canvas.toDataURL('image/png'))
    }

    return images
}

// Converts a data URL (as produced by canvas.toDataURL, e.g. from
// renderPdfPreviewImages) into a File the Anthropic Files API can upload.
export function dataUrlToFile(dataUrl: string, filename: string): File {
    const [header, base64] = dataUrl.split(',')
    const mimeType = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return new File([bytes], filename, { type: mimeType })
}

// Re-runs detection against the output file. Pages that were rasterized
// during censoring have no text layer at all, so this should come back
// clean for any match that was actually removed.
export async function verifyCensored(file: File): Promise<CensorCheckResult> {
    const remainingMatches = await findCardNumbers(file)
    return { clean: remainingMatches.length === 0, remainingMatches }
}
