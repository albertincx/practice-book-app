import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Brush,
  ChevronLeft,
  ChevronRight,
  Eraser,
  FileUp,
  Hash,
  Hand,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

type Tool = 'draw' | 'move'

type StrokePoint = {
  x: number
  y: number
}

type Stroke = {
  id: string
  page: number
  color: string
  opacity: number
  width: number
  points: StrokePoint[]
}

type PageSize = {
  width: number
  height: number
}

type PointerPosition = {
  x: number
  y: number
}

type PinchState = {
  distance: number
  zoom: number
}

type StoredPdf = {
  data: ArrayBuffer
  name: string
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25
const PEN_COLORS = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#f59e0b']
const PDF_STORE_DB = 'pdf-ink-prototype'
const PDF_STORE_NAME = 'pdfs'
const LAST_PDF_KEY = 'last-opened'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatZoom(scale: number) {
  return `${Math.round(scale * 100)}%`
}

function App() {
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeStrokeRef = useRef<Stroke | null>(null)
  const activeStrokePointerRef = useRef<number | null>(null)
  const pointersRef = useRef<Map<number, PointerPosition>>(new Map())
  const pinchStateRef = useRef<PinchState | null>(null)

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [pageSize, setPageSize] = useState<PageSize | null>(null)
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState<Tool>('draw')
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penWidth, setPenWidth] = useState(4)
  const [opacity, setOpacity] = useState(0.65)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const pageStrokes = useMemo(
    () => strokes.filter((stroke) => stroke.page === pageNumber),
    [pageNumber, strokes],
  )

  useEffect(() => {
    setPageInput(String(pageNumber))
  }, [pageNumber])

  useEffect(() => {
    let isCancelled = false

    const restoreLastPdf = async () => {
      if (!('indexedDB' in window)) {
        return
      }

      try {
        const storedPdf = await readStoredPdf()
        if (!storedPdf || isCancelled) {
          return
        }

        await openPdfData(storedPdf.data, storedPdf.name, { clearStrokes: true, persist: false })
      } catch (restoreError) {
        if (!isCancelled) {
          setError(restoreError instanceof Error ? restoreError.message : 'Could not restore the saved PDF.')
        }
      }
    }

    void restoreLastPdf()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!pdf) {
      return
    }

    let isCancelled = false
    const renderPage = async () => {
      setIsLoading(true)
      setError('')

      try {
        const page: PDFPageProxy = await pdf.getPage(pageNumber)
        if (isCancelled) {
          return
        }

        const viewport = page.getViewport({ scale: zoom })
        const baseViewport = page.getViewport({ scale: 1 })
        const canvas = pdfCanvasRef.current
        const context = canvas?.getContext('2d')

        if (!canvas || !context) {
          return
        }

        const ratio = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * ratio)
        canvas.height = Math.floor(viewport.height * ratio)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        }).promise

        if (!isCancelled) {
          setPageSize({ width: baseViewport.width, height: baseViewport.height })
        }
      } catch (renderError) {
        if (!isCancelled) {
          setError(renderError instanceof Error ? renderError.message : 'Could not render this PDF page.')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void renderPage()

    return () => {
      isCancelled = true
    }
  }, [pageNumber, pdf, zoom])

  useEffect(() => {
    const canvas = inkCanvasRef.current
    if (!canvas || !pageSize) {
      return
    }

    const ratio = window.devicePixelRatio || 1
    const width = pageSize.width * zoom
    const height = pageSize.height * zoom
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.setTransform(ratio * zoom, 0, 0, ratio * zoom, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'

    for (const stroke of pageStrokes) {
      drawStroke(context, stroke)
    }
  }, [pageSize, pageStrokes, zoom])

  const openPdfData = async (
    data: ArrayBuffer,
    name: string,
    options: { clearStrokes: boolean; persist: boolean },
  ) => {
    setIsLoading(true)
    setError('')
    cancelActiveStroke()
    pointersRef.current.clear()
    pinchStateRef.current = null

    try {
      const nextPdf = await pdfjsLib.getDocument({
        data: data.slice(0),
        canvasMaxAreaInBytes: -1,
        isImageDecoderSupported: false,
        isOffscreenCanvasSupported: false,
        maxImageSize: -1,
        useWorkerFetch: true,
        wasmUrl: '/pdfjs/wasm/',
      }).promise
      setPdf(nextPdf)
      setPdfName(name)
      setPageNumber(1)
      setZoom(1)
      if (options.clearStrokes) {
        setStrokes([])
      }
      if (options.persist) {
        await saveStoredPdf({ data, name })
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not open this PDF.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadPdf = async (file: File) => {
    const data = await file.arrayBuffer()
    await openPdfData(data, file.name, { clearStrokes: true, persist: true })
  }

  const updateZoom = (nextZoom: number) => {
    setZoom(clamp(Number(nextZoom.toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }

  const cancelActiveStroke = () => {
    const activeStroke = activeStrokeRef.current
    if (!activeStroke) {
      return
    }

    setStrokes((current) => current.filter((stroke) => stroke.id !== activeStroke.id))
    activeStrokeRef.current = null
    activeStrokePointerRef.current = null
  }

  const updatePinchState = () => {
    const positions = [...pointersRef.current.values()]
    if (positions.length < 2) {
      pinchStateRef.current = null
      return
    }

    const [firstPointer, secondPointer] = positions
    const distance = Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y)
    if (!distance) {
      return
    }

    if (!pinchStateRef.current) {
      pinchStateRef.current = { distance, zoom }
      return
    }

    const nextZoom = pinchStateRef.current.zoom * (distance / pinchStateRef.current.distance)
    updateZoom(nextZoom)
  }

  const getInkPoint = (event: PointerEvent<HTMLCanvasElement>): StrokePoint | null => {
    const canvas = inkCanvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'draw' || !pageSize) {
      return
    }

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture(event.pointerId)

    if (pointersRef.current.size >= 2) {
      cancelActiveStroke()
      updatePinchState()
      return
    }

    const point = getInkPoint(event)
    if (!point) {
      return
    }

    const stroke: Stroke = {
      id: crypto.randomUUID(),
      page: pageNumber,
      color: penColor,
      opacity,
      width: penWidth,
      points: [point],
    }

    activeStrokeRef.current = stroke
    activeStrokePointerRef.current = event.pointerId
    setStrokes((current) => [...current, stroke])
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    if (pointersRef.current.size >= 2) {
      cancelActiveStroke()
      updatePinchState()
      return
    }

    const activeStroke = activeStrokeRef.current
    if (!activeStroke || activeStrokePointerRef.current !== event.pointerId) {
      return
    }

    const point = getInkPoint(event)
    if (!point) {
      return
    }

    activeStroke.points = [...activeStroke.points, point]
    setStrokes((current) =>
      current.map((stroke) => (stroke.id === activeStroke.id ? { ...activeStroke } : stroke)),
    )
  }

  const finishStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId)

    if (pointersRef.current.size < 2) {
      pinchStateRef.current = null
    }

    if (activeStrokePointerRef.current === event.pointerId) {
      activeStrokeRef.current = null
      activeStrokePointerRef.current = null
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const undoPageStroke = () => {
    const lastPageStroke = [...strokes].reverse().find((stroke) => stroke.page === pageNumber)
    if (!lastPageStroke) {
      return
    }

    setStrokes((current) => current.filter((stroke) => stroke.id !== lastPageStroke.id))
  }

  const clearPage = () => {
    setStrokes((current) => current.filter((stroke) => stroke.page !== pageNumber))
  }

  const resetDocument = () => {
    cancelActiveStroke()
    pointersRef.current.clear()
    pinchStateRef.current = null
    setPdf(null)
    setPdfName('')
    setPageNumber(1)
    setPageInput('1')
    setZoom(1)
    setStrokes([])
    setPageSize(null)
    setError('')
    void clearStoredPdf()
  }

  const changeTool = (nextTool: Tool) => {
    cancelActiveStroke()
    pointersRef.current.clear()
    pinchStateRef.current = null
    setTool(nextTool)
  }

  const goToPage = () => {
    if (!pdf) {
      return
    }

    const requestedPage = Number.parseInt(pageInput, 10)
    if (!Number.isFinite(requestedPage)) {
      setPageInput(String(pageNumber))
      return
    }

    setPageNumber(clamp(requestedPage, 1, pdf.numPages))
  }

  return (
    <main className="flex min-h-svh flex-col bg-zinc-100 text-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-zinc-950 text-white shadow-sm active:scale-95">
            <FileUp className="h-5 w-5" />
            <input
              className="sr-only"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void loadPdf(file)
                }
                event.currentTarget.value = ''
              }}
            />
          </label>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{pdfName || 'Open a PDF'}</p>
            <p className="text-xs text-zinc-500">
              {pdf ? `Saved locally - ${pdf.numPages} pages` : 'Transparent annotation layer'}
            </p>
          </div>

          {pdf ? (
            <button
              type="button"
              aria-label="Close PDF"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700"
              onClick={resetDocument}
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </header>

      <section className="sticky top-[57px] z-10 border-b border-zinc-200 bg-white px-3 py-2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-zinc-200 bg-zinc-100 p-1">
            <button
              type="button"
              aria-label="Draw mode"
              className={`inline-flex h-9 w-10 items-center justify-center rounded ${tool === 'draw' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500'}`}
              onClick={() => changeTool('draw')}
            >
              <Brush className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Move mode"
              className={`inline-flex h-9 w-10 items-center justify-center rounded ${tool === 'move' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500'}`}
              onClick={() => changeTool('move')}
            >
              <Hand className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center rounded-md border border-zinc-200 bg-white">
            <button
              type="button"
              aria-label="Zoom out"
              className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 disabled:text-zinc-300"
              disabled={!pdf || zoom <= MIN_ZOOM}
              onClick={() => updateZoom(zoom - ZOOM_STEP)}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-14 text-center text-sm font-medium tabular-nums">{formatZoom(zoom)}</span>
            <button
              type="button"
              aria-label="Zoom in"
              className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 disabled:text-zinc-300"
              disabled={!pdf || zoom >= MAX_ZOOM}
              onClick={() => updateZoom(zoom + ZOOM_STEP)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center rounded-md border border-zinc-200 bg-white">
            <button
              type="button"
              aria-label="Previous page"
              className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 disabled:text-zinc-300"
              disabled={!pdf || pageNumber <= 1}
              onClick={() => setPageNumber((current) => current - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next page"
              className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 disabled:text-zinc-300"
              disabled={!pdf || pageNumber >= pdf.numPages}
              onClick={() => setPageNumber((current) => current + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <form
            className="flex h-10 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2"
            onSubmit={(event) => {
              event.preventDefault()
              goToPage()
            }}
          >
            <Hash className="h-4 w-4 text-zinc-500" />
            <input
              aria-label="Go to page"
              className="h-8 w-14 bg-transparent text-center text-sm font-medium tabular-nums text-zinc-950 outline-none"
              disabled={!pdf}
              inputMode="numeric"
              min="1"
              max={pdf?.numPages}
              pattern="[0-9]*"
              type="number"
              value={pageInput}
              onBlur={goToPage}
              onChange={(event) => setPageInput(event.target.value)}
            />
            <span className="text-xs text-zinc-400">/ {pdf?.numPages ?? 0}</span>
          </form>

          <button
            type="button"
            aria-label="Undo"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 disabled:text-zinc-300"
            disabled={!pageStrokes.length}
            onClick={undoPageStroke}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Clear page"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 disabled:text-zinc-300"
            disabled={!pageStrokes.length}
            onClick={clearPage}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white px-3 py-2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {PEN_COLORS.map((color) => (
              <button
                type="button"
                key={color}
                aria-label={`Use pen color ${color}`}
                className={`h-8 w-8 rounded-full border-2 ${penColor === color ? 'border-zinc-950' : 'border-zinc-200'}`}
                style={{ backgroundColor: color }}
                onClick={() => setPenColor(color)}
              />
            ))}
          </div>

          <label className="flex min-w-32 flex-1 items-center gap-2 text-xs font-medium text-zinc-600">
            <Brush className="h-4 w-4 shrink-0" />
            <input
              type="range"
              min="1"
              max="14"
              value={penWidth}
              className="w-full accent-zinc-950"
              onChange={(event) => setPenWidth(Number(event.target.value))}
            />
          </label>

          <label className="flex min-w-32 flex-1 items-center gap-2 text-xs font-medium text-zinc-600">
            <Eraser className="h-4 w-4 shrink-0 opacity-60" />
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={opacity}
              className="w-full accent-zinc-950"
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="relative flex flex-1 overflow-auto px-3 py-4">
        {!pdf ? (
          <div className="m-auto flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
            <FileUp className="h-10 w-10 text-zinc-400" />
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white active:scale-95">
              Open PDF
              <input
                className="sr-only"
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void loadPdf(file)
                  }
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        ) : (
          <div className="mx-auto min-w-max pb-24">
            <div
              className="relative overflow-hidden rounded-md bg-white shadow-xl ring-1 ring-zinc-200"
              style={{
                width: pageSize ? pageSize.width * zoom : undefined,
                height: pageSize ? pageSize.height * zoom : undefined,
              }}
            >
              <canvas ref={pdfCanvasRef} className="absolute inset-0" />
              <canvas
                ref={inkCanvasRef}
                className={`absolute inset-0 ${tool === 'draw' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                style={{ touchAction: tool === 'draw' ? 'none' : 'auto' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishStroke}
                onPointerCancel={finishStroke}
              />
              {isLoading ? (
                <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-medium text-zinc-600">
                  Loading
                </div>
              ) : null}
            </div>
          </div>
        )}

        {error ? (
          <div className="fixed inset-x-3 bottom-3 z-30 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-lg">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  )
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
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

function openPdfStore() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(PDF_STORE_DB, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(PDF_STORE_NAME)
    }
    request.onerror = () => reject(request.error ?? new Error('Could not open local PDF storage.'))
    request.onsuccess = () => resolve(request.result)
  })
}

async function readStoredPdf() {
  const database = await openPdfStore()

  return new Promise<StoredPdf | null>((resolve, reject) => {
    const transaction = database.transaction(PDF_STORE_NAME, 'readonly')
    const store = transaction.objectStore(PDF_STORE_NAME)
    const request = store.get(LAST_PDF_KEY)

    request.onerror = () => reject(request.error ?? new Error('Could not read saved PDF.'))
    request.onsuccess = () => resolve((request.result as StoredPdf | undefined) ?? null)
    transaction.oncomplete = () => database.close()
  })
}

async function saveStoredPdf(pdf: StoredPdf) {
  if (!('indexedDB' in window)) {
    return
  }

  const database = await openPdfStore()

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PDF_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(PDF_STORE_NAME)
    const request = store.put(pdf, LAST_PDF_KEY)

    request.onerror = () => reject(request.error ?? new Error('Could not save PDF locally.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save PDF locally.'))
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
  })
}

async function clearStoredPdf() {
  if (!('indexedDB' in window)) {
    return
  }

  const database = await openPdfStore()

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PDF_STORE_NAME, 'readwrite')
    const store = transaction.objectStore(PDF_STORE_NAME)
    const request = store.delete(LAST_PDF_KEY)

    request.onerror = () => reject(request.error ?? new Error('Could not clear saved PDF.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear saved PDF.'))
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
  })
}

export default App
