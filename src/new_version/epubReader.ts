import JSZip from 'jszip'

export interface EpubChapter {
    title: string
    html: string
}

export interface EpubDocument {
    numPages: number
    chapters: EpubChapter[]
}

function resolvePath(basePath: string, relativePath: string): string {
    const stack = basePath.split('/').slice(0, -1)
    const parts = relativePath.split('/')
    for (const part of parts) {
        if (part === '.') continue
        if (part === '..') {
            if (stack.length > 0) stack.pop()
        } else {
            stack.push(part)
        }
    }
    return stack.join('/')
}

export async function parseEpub(data: ArrayBuffer): Promise<EpubDocument> {
    const zip = await JSZip.loadAsync(data)
    
    // 1. Find rootfile from META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml')
    if (!containerFile) {
        throw new Error('Invalid EPUB file: META-INF/container.xml missing.')
    }
    const containerXmlText = await containerFile.async('text')
    const parser = new DOMParser()
    const containerDoc = parser.parseFromString(containerXmlText, 'text/xml')
    const rootfileEl = containerDoc.querySelector('rootfile')
    const opfPath = rootfileEl?.getAttribute('full-path')
    if (!opfPath) {
        throw new Error('Invalid EPUB file: OPF path not found in container.xml.')
    }

    // 2. Parse OPF file
    const opfFile = zip.file(opfPath)
    if (!opfFile) {
        throw new Error(`Invalid EPUB file: ${opfPath} missing.`)
    }
    const opfXmlText = await opfFile.async('text')
    const opfDoc = parser.parseFromString(opfXmlText, 'text/xml')

    // Manifest: id -> href
    const manifestItems = new Map<string, { href: string; mediaType: string }>()
    opfDoc.querySelectorAll('manifest > item').forEach((item) => {
        const id = item.getAttribute('id')
        const href = item.getAttribute('href')
        const mediaType = item.getAttribute('media-type') || ''
        if (id && href) {
            manifestItems.set(id, { href, mediaType })
        }
    })

    // Spine: sequential chapter itemrefs
    const spineItemrefs = opfDoc.querySelectorAll('spine > itemref')
    const chapterHrefs: string[] = []
    spineItemrefs.forEach((itemref) => {
        const idref = itemref.getAttribute('idref')
        if (idref && manifestItems.has(idref)) {
            const item = manifestItems.get(idref)!
            const fullHref = resolvePath(opfPath, item.href)
            chapterHrefs.push(fullHref)
        }
    })

    if (chapterHrefs.length === 0) {
        // Fallback: search manifest for XHTML/HTML files if spine is missing
        manifestItems.forEach((item) => {
            if (item.mediaType.includes('html') || item.mediaType.includes('xhtml')) {
                chapterHrefs.push(resolvePath(opfPath, item.href))
            }
        })
    }

    // 3. Load chapter contents and inline images as Data URIs
    const chapters: EpubChapter[] = []

    for (let i = 0; i < chapterHrefs.length; i++) {
        const href = chapterHrefs[i]
        const file = zip.file(href) || zip.file(decodeURIComponent(href))
        if (!file) continue

        let htmlContent = await file.async('text')
        const chapterDoc = parser.parseFromString(htmlContent, 'text/html')

        // Extract title
        const titleEl = chapterDoc.querySelector('title') || chapterDoc.querySelector('h1') || chapterDoc.querySelector('h2')
        const title = titleEl?.textContent?.trim() || `Chapter ${i + 1}`

        // Convert images to base64 Data URIs
        const imgTags = Array.from(chapterDoc.querySelectorAll('img'))
        for (const imgTag of imgTags) {
            const src = imgTag.getAttribute('src')
            if (!src || src.startsWith('data:') || src.startsWith('http')) continue

            const imgPath = resolvePath(href, src)
            const imgFile = zip.file(imgPath) || zip.file(decodeURIComponent(imgPath))
            if (imgFile) {
                const mimeType = getMimeTypeFromFilename(imgPath)
                const base64 = await imgFile.async('base64')
                imgTag.setAttribute('src', `data:${mimeType};base64,${base64}`)
            }
        }

        // Clean up body content
        const bodyContent = chapterDoc.body ? chapterDoc.body.innerHTML : htmlContent
        chapters.push({
            title,
            html: bodyContent,
        })
    }

    if (chapters.length === 0) {
        throw new Error('Could not parse any readable chapters from EPUB file.')
    }

    return {
        numPages: chapters.length,
        chapters,
    }
}

function getMimeTypeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'png':
            return 'image/png'
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg'
        case 'gif':
            return 'image/gif'
        case 'webp':
            return 'image/webp'
        case 'svg':
            return 'image/svg+xml'
        default:
            return 'image/png'
    }
}

export async function renderEpubChapterToCanvas(
    chapter: EpubChapter,
    chapterIndex: number,
    totalChapters: number,
    canvas: HTMLCanvasElement,
    zoom: number
): Promise<{ width: number; height: number }> {
    const baseWidth = 800
    const baseHeight = 1100

    const ratio = window.devicePixelRatio || 1
    const viewportWidth = baseWidth * zoom
    const viewportHeight = baseHeight * zoom

    canvas.width = Math.floor(viewportWidth * ratio)
    canvas.height = Math.floor(viewportHeight * ratio)
    canvas.style.width = `${viewportWidth}px`
    canvas.style.height = `${viewportHeight}px`

    const context = canvas.getContext('2d')
    if (!context) {
        return { width: baseWidth, height: baseHeight }
    }

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)

    // Render using SVG foreignObject
    const svgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="${baseWidth}" height="${baseHeight}">
  <style>
    .epub-container {
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #18181b;
      background-color: #ffffff;
      padding: 40px 48px;
      box-sizing: border-box;
      width: ${baseWidth}px;
      height: ${baseHeight}px;
      overflow: hidden;
    }
    .epub-header {
      font-size: 12px;
      color: #71717a;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 8px;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .epub-footer {
      position: absolute;
      bottom: 24px;
      left: 48px;
      right: 48px;
      font-size: 12px;
      color: #a1a1aa;
      border-top: 1px solid #e4e4e7;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
    }
    h1, h2, h3 { color: #09090b; font-weight: 700; margin-top: 1em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; text-align: justify; }
    img { max-width: 100%; height: auto; display: block; margin: 16px auto; }
  </style>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" class="epub-container">
      <div class="epub-header">${escapeXml(chapter.title)}</div>
      <div class="epub-body">${chapter.html}</div>
      <div class="epub-footer">
        <span>EPUB Reader</span>
        <span>Chapter ${chapterIndex} of ${totalChapters}</span>
      </div>
    </div>
  </foreignObject>
</svg>
`

    return new Promise((resolve) => {
        const img = new Image()
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        img.onload = () => {
            context.setTransform(ratio * zoom, 0, 0, ratio * zoom, 0, 0)
            context.drawImage(img, 0, 0, baseWidth, baseHeight)
            URL.revokeObjectURL(url)
            resolve({ width: baseWidth, height: baseHeight })
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            // Fallback rendering on canvas context directly
            context.fillStyle = '#ffffff'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.fillStyle = '#18181b'
            context.font = `${18 * ratio * zoom}px sans-serif`
            context.fillText(chapter.title, 40 * ratio * zoom, 60 * ratio * zoom)

            // Plain text fallback
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = chapter.html
            const textContent = tempDiv.textContent || ''
            const lines = wrapText(context, textContent, (baseWidth - 80) * ratio * zoom)
            
            context.font = `${14 * ratio * zoom}px sans-serif`
            let y = 100 * ratio * zoom
            for (const line of lines.slice(0, 35)) {
                context.fillText(line, 40 * ratio * zoom, y)
                y += 20 * ratio * zoom
            }

            resolve({ width: baseWidth, height: baseHeight })
        }

        img.src = url
    })
}

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
        } else {
            currentLine = testLine
        }
    }
    if (currentLine) lines.push(currentLine)
    return lines
}
