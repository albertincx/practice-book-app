
export type Tool = 'draw' | 'move'

export type StrokePoint = {
    x: number
    y: number
}

export type Stroke = {
    createdAt?: number
    id: string
    page: number
    color: string
    opacity: number
    width: number
    points: StrokePoint[]
}

export type TextAnnotation = {
    color: string
    createdAt: number
    id: string
    opacity: number
    page: number
    size: number
    text: string
    x: number
    y: number
}

export type PageSize = {
    width: number
    height: number
}

export type PointerPosition = {
    x: number
    y: number
}

export type PinchState = {
    distance: number
    zoom: number
}

export type TextDragState = {
    offsetX: number
    offsetY: number
    pointerId: number
    textId: string
}


export type PdfMetadata = {
    id: string
    name: string
    opacity?: number
    paintingEnabled?: boolean
    pageNumber?: number
    penColor?: string
    penWidth?: number
    strokes?: Stroke[]
    texts?: TextAnnotation[]
    zoom?: number
    updatedAt: number
}

export const  MIN_ZOOM = 0.5
export const  MAX_ZOOM = 3
export const  ZOOM_STEP = 0.25
export const  PEN_COLORS = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#f59e0b']
export const  PDF_STORE_DB = 'pdf-learn-prototype'
export const  PDF_STORE_NAME = 'pdfs'
export const  LAST_PDF_KEY = 'last-opened'
export const  DONATE_URL = 'https://boosty.to/safiullin' // TODO: Replace with your actual donation link

export type Lang = string

export type DeviceScreenInfo = {
    viewportWidth: number
    viewportHeight: number
    outerWidth: number
    outerHeight: number
    screenWidth: number
    screenHeight: number
    availWidth: number
    availHeight: number
    devicePixelRatio: number
    colorDepth?: number
    pixelDepth?: number
    orientationType?: string
    orientationAngle?: number
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
}

export function formatZoom(scale: number) {
    return `${Math.round(scale * 100)}%`
}

export function formatBytes(bytes: number) {
    if (!bytes) {
        return '0 B'
    }

    const units = ['B', 'KB', 'MB', 'GB']
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const value = bytes / 1024 ** unitIndex

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
    const [firstPoint, ...points] = stroke.points
    if (!firstPoint) {
        return
    }

    context.save()
    context.globalAlpha = stroke.opacity
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.width
    context.beginPath()
    context.moveTo(firstPoint.x, firstPoint.y)

    if (!points.length) {
        context.lineTo(firstPoint.x + 0.01, firstPoint.y + 0.01)
    } else {
        for (const point of points) {
            context.lineTo(point.x, point.y)
        }
    }

    context.stroke()
    context.restore()
}

export function drawTextAnnotation(context: CanvasRenderingContext2D, text: TextAnnotation) {
    context.save()
    context.globalAlpha = text.opacity
    context.fillStyle = text.color
    context.font = `${text.size}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    context.textBaseline = 'top'

    const lines = text.text.split('\n')
    lines.forEach((line, index) => {
        context.fillText(line, text.x, text.y + index * text.size * 1.25)
    })

    context.restore()
}

export function findTextAtPoint(texts: TextAnnotation[], point: StrokePoint) {
    return [...texts].reverse().find((text) => {
        const bounds = getTextBounds(text)
        return (
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height
        )
    })
}

export function getTextBounds(text: TextAnnotation) {
    const lines = text.text.split('\n')
    const padding = Math.max(8, text.size * 0.35)
    const width = Math.max(...lines.map((line) => measureTextLine(line, text.size)), text.size)
    const height = lines.length * text.size * 1.25

    return {
        height: height + padding * 2,
        width: width + padding * 2,
        x: text.x - padding,
        y: text.y - padding,
    }
}

export function measureTextLine(text: string, size: number) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
        return text.length * size * 0.55
    }

    context.font = `${size}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    return context.measureText(text).width
}

export function openPdfStore() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(PDF_STORE_DB, 2)

        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
                db.createObjectStore(PDF_STORE_NAME)
            }
            if (!db.objectStoreNames.contains('pdfs_metadata')) {
                db.createObjectStore('pdfs_metadata')
            }
        }
        request.onerror = () => reject(request.error ?? new Error('Could not open local PDF storage.'))
        request.onsuccess = () => resolve(request.result)
    })
}

export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers or HTTP mobile testing
    // @ts-ignore
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    // @ts-ignore
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
};

export async  function migrateDatabaseIfNeeded(): Promise<string | null> {
    if (!('indexedDB' in window)) {
        return null
    }
    const database = await openPdfStore()

    const lastOpened = await new Promise<any>((resolve) => {
        try {
            const transaction = database.transaction(PDF_STORE_NAME, 'readonly')
            const store = transaction.objectStore(PDF_STORE_NAME)
            const request = store.get(LAST_PDF_KEY)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => resolve(null)
        } catch {
            resolve(null)
        }
    })

    if (!lastOpened) {
        database.close()
        return null
    }

    const newId = generateId()
    const now = Date.now()

    const data = lastOpened.data as ArrayBuffer
    const metadata: PdfMetadata = {
        id: newId,
        name: lastOpened.name || 'Migrated PDF',
        opacity: lastOpened.opacity ?? 0.65,
        paintingEnabled: lastOpened.paintingEnabled ?? true,
        pageNumber: lastOpened.pageNumber ?? 1,
        penColor: lastOpened.penColor ?? PEN_COLORS[0],
        penWidth: lastOpened.penWidth ?? 4,
        strokes: lastOpened.strokes ?? [],
        texts: lastOpened.texts ?? [],
        zoom: lastOpened.zoom ?? 1,
        updatedAt: now,
    }

    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction([PDF_STORE_NAME, 'pdfs_metadata'], 'readwrite')
        const pdfsStore = transaction.objectStore(PDF_STORE_NAME)
        const metaStore = transaction.objectStore('pdfs_metadata')

        pdfsStore.put(data, newId)
        metaStore.put(metadata, newId)
        pdfsStore.delete(LAST_PDF_KEY)

        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error ?? new Error('Migration failed'))
    })

    database.close()
    return newId
}

export async  function savePdfToLibrary(id: string, name: string, data: ArrayBuffer) {
    if (!('indexedDB' in window)) {
        return
    }
    const database = await openPdfStore()
    const now = Date.now()
    const metadata: PdfMetadata = {
        id,
        name,
        opacity: 0.65,
        paintingEnabled: true,
        pageNumber: 1,
        penColor: PEN_COLORS[0],
        penWidth: 4,
        strokes: [],
        texts: [],
        zoom: 1,
        updatedAt: now,
    }

    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction([PDF_STORE_NAME, 'pdfs_metadata'], 'readwrite')
        const pdfsStore = transaction.objectStore(PDF_STORE_NAME)
        const metaStore = transaction.objectStore('pdfs_metadata')

        pdfsStore.put(data.slice(0), id)
        metaStore.put(metadata, id)

        transaction.oncomplete = () => {
            database.close()
            resolve()
        }
        transaction.onerror = () => {
            database.close()
            reject(transaction.error ?? new Error('Could not save PDF to library.'))
        }
    })
}

export async  function getPdfFile(id: string): Promise<ArrayBuffer> {
    const database = await openPdfStore()
    return new Promise<ArrayBuffer>((resolve, reject) => {
        const transaction = database.transaction(PDF_STORE_NAME, 'readonly')
        const store = transaction.objectStore(PDF_STORE_NAME)
        const request = store.get(id)

        request.onerror = () => reject(request.error ?? new Error('Could not load PDF file.'))
        request.onsuccess = () => {
            if (!request.result) {
                reject(new Error('PDF file not found in storage.'))
            } else {
                resolve(request.result as ArrayBuffer)
            }
        }
        transaction.oncomplete = () => database.close()
    })
}

export async  function getPdfMetadata(id: string): Promise<PdfMetadata | null> {
    const database = await openPdfStore()
    return new Promise<PdfMetadata | null>((resolve, reject) => {
        const transaction = database.transaction('pdfs_metadata', 'readonly')
        const store = transaction.objectStore('pdfs_metadata')
        const request = store.get(id)

        request.onerror = () => reject(request.error ?? new Error('Could not load PDF metadata.'))
        request.onsuccess = () => resolve((request.result as PdfMetadata | undefined) ?? null)
        transaction.oncomplete = () => database.close()
    })
}

export async  function savePdfMetadata(metadata: PdfMetadata): Promise<void> {
    if (!('indexedDB' in window)) {
        return
    }
    const database = await openPdfStore()
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('pdfs_metadata', 'readwrite')
        const store = transaction.objectStore('pdfs_metadata')
        const request = store.put(metadata, metadata.id)

        request.onerror = () => reject(request.error ?? new Error('Could not save PDF metadata.'))
        transaction.oncomplete = () => {
            database.close()
            resolve()
        }
    })
}

export async  function mergePdfMetadata(id: string, updates: Partial<Omit<PdfMetadata, 'id' | 'name'>>) {
    if (!('indexedDB' in window)) {
        return
    }
    const metadata = await getPdfMetadata(id)
    if (!metadata) {
        return
    }
    const updatedMetadata: PdfMetadata = {
        ...metadata,
        ...updates,
        updatedAt: Date.now(),
    }
    await savePdfMetadata(updatedMetadata)
}

export async  function getAllPdfMetadata(): Promise<PdfMetadata[]> {
    if (!('indexedDB' in window)) {
        return []
    }
    const database = await openPdfStore()
    return new Promise<PdfMetadata[]>((resolve, reject) => {
        const transaction = database.transaction('pdfs_metadata', 'readonly')
        const store = transaction.objectStore('pdfs_metadata')
        const request = store.getAll()

        request.onerror = () => reject(request.error ?? new Error('Could not load PDF metadata list.'))
        request.onsuccess = () => {
            const list = (request.result as PdfMetadata[] ?? [])
            list.sort((a, b) => b.updatedAt - a.updatedAt)
            resolve(list)
        }
        transaction.oncomplete = () => database.close()
    })
}

export async  function deletePdfFromLibrary(id: string): Promise<void> {
    if (!('indexedDB' in window)) {
        return
    }
    const database = await openPdfStore()
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction([PDF_STORE_NAME, 'pdfs_metadata'], 'readwrite')
        const pdfsStore = transaction.objectStore(PDF_STORE_NAME)
        const metaStore = transaction.objectStore('pdfs_metadata')

        pdfsStore.delete(id)
        metaStore.delete(id)

        transaction.oncomplete = () => {
            database.close()
            resolve()
        }
        transaction.onerror = () => {
            database.close()
            reject(transaction.error ?? new Error('Could not delete PDF from storage.'))
        }
    })
}

export async  function getLibraryTotalSize(): Promise<number> {
    if (!('indexedDB' in window)) {
        return 0
    }
    const database = await openPdfStore()
    const metadataList = await getAllPdfMetadata()
    const metadataSize = new Blob([JSON.stringify(metadataList)]).size

    return new Promise<number>((resolve, reject) => {
        const transaction = database.transaction(PDF_STORE_NAME, 'readonly')
        const store = transaction.objectStore(PDF_STORE_NAME)
        const request = store.getAll()

        request.onerror = () => reject(request.error ?? new Error('Could not calculate storage size.'))
        request.onsuccess = () => {
            const files = request.result as ArrayBuffer[]
            const filesSize = files.reduce((acc, file) => acc + (file?.byteLength ?? 0), 0)
            resolve(filesSize + metadataSize)
        }
        transaction.oncomplete = () => database.close()
    })
}

export async  function clearAllLocalData(): Promise<void> {
    if (!('indexedDB' in window)) {
        return
    }
    const database = await openPdfStore()
    return new Promise<void>((resolve, reject) => {
        const transaction = database.transaction([PDF_STORE_NAME, 'pdfs_metadata'], 'readwrite')
        const pdfsStore = transaction.objectStore(PDF_STORE_NAME)
        const metaStore = transaction.objectStore('pdfs_metadata')

        pdfsStore.clear()
        metaStore.clear()

        transaction.oncomplete = () => {
            database.close()
            resolve()
        }
        transaction.onerror = () => {
            database.close()
            reject(transaction.error ?? new Error('Could not clear database.'))
        }
    })
}

export async function timeout(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
