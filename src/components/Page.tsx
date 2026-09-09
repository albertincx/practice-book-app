import {type PointerEvent, useEffect, useMemo, useRef, useState} from 'react'
import {ChevronLeft, ChevronRight, Minus, Plus,} from 'lucide-react'
import type {PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import {
    type BookFileType,
    clamp,
    drawStroke,
    drawTextAnnotation,
    findTextAtPoint,
    formatZoom,
    generateId,
    getAllPdfMetadata,
    getBookFileType,
    getPdfFile,
    getPdfMetadata,
    type Lang,
    MAX_ZOOM,
    mergePdfMetadata,
    migrateDatabaseIfNeeded,
    MIN_ZOOM,
    type PageSize,
    type PdfMetadata,
    PEN_COLORS,
    type PinchState,
    type PointerPosition,
    savePdfToLibrary,
    type Stroke,
    type StrokePoint,
    type TextAnnotation,
    type TextDragState,
    ZOOM_STEP
} from '../utils.ts'
import {type EpubDocument, parseEpub, renderEpubChapterToCanvas} from '../epubReader.ts'

import {useOrientation} from "../hooks/useOrientation.ts";
import {TRANSLATIONS} from "../translations.ts";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

function Page() {
    const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const inkCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const activeStrokeRef = useRef<Stroke | null>(null)
    const activeStrokePointerRef = useRef<number | null>(null)
    const pointersRef = useRef<Map<number, PointerPosition>>(new Map())
    const pinchStateRef = useRef<PinchState | null>(null)
    const textDragRef = useRef<TextDragState | null>(null)
    const hasOpenedPdfRef = useRef(false)
    useOrientation();

    const [activeFileType, setActiveFileType] = useState<BookFileType>('pdf')
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
    const [epubDoc, setEpubDoc] = useState<EpubDocument | null>(null)
    const [imageDoc, setImageDoc] = useState<HTMLImageElement | null>(null)
    const [numPages, setNumPages] = useState<number>(0)
    const [pdfName, setPdfName] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState<PageSize | null>(null)
    const [zoom, setZoom] = useState(1)
// В состояние компонента App добавляем счетчик для цифр
    const [nextNumber, setNextNumber] = useState(1);
// Состояние для внутренней галереи снимков
    const [galleryImages] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('pdf-gallery-images');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [theme] = useState<'system' | 'light' | 'dark'>(() => {
        const saved = localStorage.getItem('pdf-theme')
        return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system'
    })
// Сохранение в localStorage при каждом изменении галереи
    useEffect(() => {
        try {
            localStorage.setItem('pdf-gallery-images', JSON.stringify(galleryImages));
        } catch (e) {
            console.error("Не удалось сохранить галерею в localStorage", e);
        }
    }, [galleryImages]);

    useEffect(() => {
        // 1. Создаем медиа-запрос для проверки системной темы
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Функция для применения нужного класса
        const applyTheme = (isDark: boolean) => {
            if (isDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
            } else {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
            }
        };

        // 2. Устанавливаем тему при первой загрузке
        if (!theme) applyTheme(mediaQuery.matches);

        // 3. Слушаем изменения системной темы в реальном времени
        const handleChange = (e: any) => applyTheme(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        // Очищаем слушатель при размонтировании компонента
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const [, setResolvedTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        localStorage.setItem('pdf-theme', theme)

        const updateResolvedTheme = () => {
            if (theme === 'system') {
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                setResolvedTheme(systemDark ? 'dark' : 'light')
            } else {
                setResolvedTheme(theme)
            }
        }

        updateResolvedTheme()

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const listener = (e: MediaQueryListEvent) => {
                setResolvedTheme(e.matches ? 'dark' : 'light')
            }
            mediaQuery.addEventListener('change', listener)
            return () => mediaQuery.removeEventListener('change', listener)
        }
    }, [theme])

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            const handleMessage = (event: MessageEvent) => {
                if (event.data && event.data.action === 'load-pdf' && event.data.file) {
                    void loadPdf(event.data.file)
                }
            }
            navigator.serviceWorker.addEventListener('message', handleMessage)

            // Запрашиваем файл, если мы открылись через share target
            if (window.location.search.includes('shared=1')) {
                navigator.serviceWorker.ready.then((registration) => {
                    registration.active?.postMessage('get-shared-file')
                })
            }

            return () => navigator.serviceWorker.removeEventListener('message', handleMessage)
        }
    }, [pdf])

    const [tool] = useState<string>(() => {
        const saved = localStorage.getItem('pdf-tool')
        return saved || 'draw'
    })

    const [strokes, setStrokes] = useState<Stroke[]>([])
    const [texts, setTexts] = useState<TextAnnotation[]>([])
    const [pendingText, setPendingText] = useState('')
    const [penColor, setPenColor] = useState(PEN_COLORS[0])
    const [penWidth, setPenWidth] = useState(4)
    const [opacity, setOpacity] = useState(0.65)
    const [isPaintingEnabled, setIsPaintingEnabled] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [activePdfId, setActivePdfId] = useState<string | null>(null)
    const [, setPdfList] = useState<PdfMetadata[]>([])
    const [lang] = useState<Lang>(() => {
        const saved = localStorage.getItem('pdf-lang')
        return (saved === 'ru' || saved === 'en') ? saved : 'en'
    })

    const [isPinchZoomEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('pdf-pinch-zoom')
        return saved !== null ? saved === 'true' : false // По умолчанию включено
    })

    useEffect(() => {
        localStorage.setItem('pdf-pinch-zoom', String(isPinchZoomEnabled))
    }, [isPinchZoomEnabled])

    useEffect(() => {
        localStorage.setItem('pdf-lang', lang)
    }, [lang])

    const [headerPosition] = useState<'top' | 'bottom'>(() => {
        const saved = localStorage.getItem('pdf-header-position')
        return (saved === 'top' || saved === 'bottom') ? saved : 'top'
    })

    useEffect(() => {
        localStorage.setItem('pdf-header-position', headerPosition)
    }, [headerPosition])

    useEffect(() => {
        if (pdfName) {
            document.title = `${pdfName} — PDF Learn`
        } else {
            document.title = `PDF Learn — ${t.featureDraw}`
        }
    }, [pdfName, lang])

    useEffect(() => {
        const childElement = document.getElementById('main-sec');
        if (!childElement) {
            return
        }
        // console.log('a')
        childElement.scrollTo({top: 0, left: 0, behavior: 'auto'})
    }, [activePdfId, pdfName, pdf, pageNumber])

    const pageStrokes = useMemo(
        () => strokes.filter((stroke) => stroke.page === pageNumber),
        [pageNumber, strokes],
    )
    const pageTexts = useMemo(
        () => texts.filter((text) => text.page === pageNumber),
        [pageNumber, texts],
    )

    const refreshPdfList = async () => {
        try {
            const list = await getAllPdfMetadata()
            setPdfList(list)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not refresh PDF library list.')
        }
    }

    const loadPdfFromLibrary = async (id: string) => {
        setIsLoading(true)
        setError('')
        try {
            const metadata = await getPdfMetadata(id)
            if (!metadata) {
                throw new Error('Book metadata not found.')
            }
            const data = await getPdfFile(id)

            await openBookData(data, metadata.name, {
                clearStrokes: true,
                fileType: metadata.fileType,
                pageNumber: metadata.pageNumber,
                strokes: metadata.strokes,
                texts: metadata.texts,
                zoom: metadata.zoom,
            })

            setActivePdfId(id)
            localStorage.setItem('active-pdf-id', id)

            if (metadata.penColor) {
                setPenColor(metadata.penColor)
            }
            if (metadata.penWidth !== undefined) {
                setPenWidth(metadata.penWidth)
            }
            if (metadata.opacity !== undefined) {
                setOpacity(metadata.opacity)
            }
            if (metadata.paintingEnabled !== undefined) {
                setIsPaintingEnabled(metadata.paintingEnabled)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load book.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        let isCancelled = false

        const initApp = async () => {
            if (!('indexedDB' in window)) {
                setIsLoading(false)
                return
            }

            try {
                let activeId = await migrateDatabaseIfNeeded()
                if (!activeId) {
                    activeId = localStorage.getItem('active-pdf-id')
                } else {
                    localStorage.setItem('active-pdf-id', activeId)
                }

                const list = await getAllPdfMetadata()
                if (isCancelled) {
                    if (list) {
                        setIsLoading(false)
                    }
                    return
                }
                setPdfList(list)

                if (activeId && list.some((item) => item.id === activeId)) {
                    await loadPdfFromLibrary(activeId)
                } else if (list.length > 0) {
                    await loadPdfFromLibrary(list[0].id)
                }
            } catch (initError) {
                // setIsLoading(false)
                if (!isCancelled) {
                    setError(initError instanceof Error ? initError.message : 'Could not initialize application data.')
                }
            }
        }

        void initApp()

        return () => {
            isCancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!activePdfId || (!pdf && !epubDoc && !imageDoc) || !hasOpenedPdfRef.current) {
            return
        }

        const saveTimer = window.setTimeout(() => {
            void mergePdfMetadata(activePdfId, {
                opacity,
                paintingEnabled: isPaintingEnabled,
                pageNumber,
                penColor,
                penWidth,
                strokes,
                texts,
                zoom,
            }).then(() => {
                void refreshPdfList()
            })
        }, 250)

        return () => window.clearTimeout(saveTimer)
    }, [activePdfId, epubDoc, imageDoc, isPaintingEnabled, opacity, pageNumber, pdf, penColor, penWidth, strokes, texts, zoom])

    useEffect(() => {
        if (!pdf && !epubDoc && !imageDoc) {
            setIsLoading(false)
            return
        }

        let isCancelled = false
        const renderPage = async () => {
            setError('')

            const canvas = pdfCanvasRef.current
            const context = canvas?.getContext('2d')

            if (!canvas || !context) {
                return
            }
            setIsLoading(true)

            try {
                if (activeFileType === 'pdf' && pdf) {
                    const page: PDFPageProxy = await pdf.getPage(pageNumber)
                    if (isCancelled) {
                        return
                    }

                    const viewport = page.getViewport({scale: zoom})
                    const baseViewport = page.getViewport({scale: 1})

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
                        setPageSize({width: baseViewport.width, height: baseViewport.height})
                    }
                } else if (activeFileType === 'epub' && epubDoc) {
                    const chapterIndex = clamp(pageNumber, 1, epubDoc.numPages)
                    const chapter = epubDoc.chapters[chapterIndex - 1]
                    if (chapter) {
                        const size = await renderEpubChapterToCanvas(
                            chapter,
                            chapterIndex,
                            epubDoc.numPages,
                            canvas,
                            zoom
                        )
                        if (!isCancelled) {
                            setPageSize(size)
                        }
                    }
                } else if (activeFileType === 'image' && imageDoc) {
                    const baseWidth = imageDoc.naturalWidth || 800
                    const baseHeight = imageDoc.naturalHeight || 600
                    const ratio = window.devicePixelRatio || 1

                    const viewportWidth = baseWidth * zoom
                    const viewportHeight = baseHeight * zoom

                    canvas.width = Math.floor(viewportWidth * ratio)
                    canvas.height = Math.floor(viewportHeight * ratio)
                    canvas.style.width = `${viewportWidth}px`
                    canvas.style.height = `${viewportHeight}px`

                    context.setTransform(ratio * zoom, 0, 0, ratio * zoom, 0, 0)
                    context.clearRect(0, 0, baseWidth, baseHeight)
                    context.drawImage(imageDoc, 0, 0, baseWidth, baseHeight)

                    if (!isCancelled) {
                        setPageSize({width: baseWidth, height: baseHeight})
                    }
                }
            } catch (renderError) {
                if (!isCancelled) {
                    setError(renderError instanceof Error ? renderError.message : 'Could not render page.')
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
    }, [activeFileType, epubDoc, imageDoc, pageNumber, pdf, zoom])

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
        for (const text of pageTexts) {
            drawTextAnnotation(context, text)
        }
    }, [pageSize, pageStrokes, pageTexts, zoom])

    const openBookData = async (
        data: ArrayBuffer,
        name: string,
        options: {
            clearStrokes: boolean
            fileType?: BookFileType
            pageNumber?: number
            strokes?: Stroke[]
            texts?: TextAnnotation[]
            zoom?: number
        },
    ) => {
        setIsLoading(true)
        setError('')
        cancelActiveStroke()
        pointersRef.current.clear()
        pinchStateRef.current = null
        textDragRef.current = null

        const type = options.fileType || getBookFileType(name)
        setActiveFileType(type)

        try {
            if (type === 'epub') {
                const epub = await parseEpub(data.slice(0))
                setEpubDoc(epub)
                setPdf(null)
                setImageDoc(null)
                setNumPages(epub.numPages)
                setPdfName(name)
                setPageNumber(clamp(options.pageNumber ?? 1, 1, epub.numPages))
            } else if (type === 'image') {
                const blob = new Blob([data.slice(0)])
                const url = URL.createObjectURL(blob)
                const img = new Image()
                img.src = url
                await img.decode().catch(() => new Promise((res) => {
                    img.onload = res
                }))
                setImageDoc(img)
                setPdf(null)
                setEpubDoc(null)
                setNumPages(1)
                setPdfName(name)
                setPageNumber(1)
            } else {
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
                setEpubDoc(null)
                setImageDoc(null)
                setNumPages(nextPdf.numPages)
                setPdfName(name)
                setPageNumber(clamp(options.pageNumber ?? 1, 1, nextPdf.numPages))
            }

            setZoom(clamp(options.zoom ?? 1, MIN_ZOOM, MAX_ZOOM))
            if (options.clearStrokes) {
                setStrokes(options.strokes ?? [])
                setTexts(options.texts ?? [])
            }
            hasOpenedPdfRef.current = true
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Could not open this document.')
        } finally {
            setIsLoading(false)
        }
    }

    const loadBooks = async (files: FileList | File[]) => {
        setIsLoading(true)
        setError('')
        try {
            const fileArray = Array.from(files)
            if (fileArray.length === 0) return

            let firstId: string | null = null

            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i]
                const data = await file.arrayBuffer()
                const nextId = generateId()
                const fileType = getBookFileType(file.name, file.type)
                await savePdfToLibrary(nextId, file.name, data, fileType)
                if (i === 0) {
                    firstId = nextId
                }
            }

            await refreshPdfList()
            if (firstId) {
                await loadPdfFromLibrary(firstId)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load books.')
        } finally {
            setIsLoading(false)
        }
    }

    const loadPdf = async (file: File) => {
        await loadBooks([file])
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
        if (!isPinchZoomEnabled) {
            return
        }

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
            pinchStateRef.current = {distance, zoom}
            return
        }

        // Считаем коэффициент изменения относительно ПРОШЛОГО кадра, а не старта
        // @ts-ignore
        const scaleFactor = distance / pinchStateRef.current.distance
        const nextZoom = zoom * scaleFactor // Используем текущий актуальный state/переменную зума

        // Обновляем базовое расстояние и текущий зум для следующего шага
        pinchStateRef.current = {distance, zoom: nextZoom}

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
        // Внутри handlePointerDown (когда tool === 'numbering')
        console.log('aaa', tool)
        if (tool === 'numbering') {
            console.log('aaa')
            const point = getInkPoint(event);
            if (!point) return;

            // Добавляем текущую цифру как текстовую аннотацию
            setTexts((current) => [
                ...current,
                {
                    color: penColor,
                    createdAt: Date.now(),
                    id: generateId(),
                    opacity,
                    page: pageNumber,
                    size: Math.max(16, penWidth * 5), // делаем цифру чуть заметнее
                    text: String(nextNumber),
                    x: point.x,
                    y: point.y,
                },
            ]);

            // Увеличиваем счетчик на 1 для следующего тапа
            setNextNumber((prev) => prev + 1);
            return;
        }

        if (tool !== 'draw' || !pageSize) {
            return
        }

        if (!isPinchZoomEnabled && pointersRef.current.size > 1) {
            return
        }

        pointersRef.current.set(event.pointerId, {x: event.clientX, y: event.clientY})
        event.currentTarget.setPointerCapture(event.pointerId)

        if (isPinchZoomEnabled && pointersRef.current.size >= 2) {
            cancelActiveStroke()
            updatePinchState()
            return
        }

        const point = getInkPoint(event)
        if (!point) {
            return
        }

        if (pendingText) {
            placeText(point)
            return
        }

        const touchedText = findTextAtPoint(pageTexts, point)
        if (touchedText) {
            textDragRef.current = {
                offsetX: point.x - touchedText.x,
                offsetY: point.y - touchedText.y,
                pointerId: event.pointerId,
                textId: touchedText.id,
            }
            return
        }

        if (!isPaintingEnabled) {
            return
        }

        const stroke: Stroke = {
            createdAt: Date.now(),
            id: generateId(),
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
            pointersRef.current.set(event.pointerId, {x: event.clientX, y: event.clientY})
        }

        if (isPinchZoomEnabled && pointersRef.current.size >= 2) {
            textDragRef.current = null
            cancelActiveStroke()
            updatePinchState()
            return
        }

        if (!isPinchZoomEnabled && pointersRef.current.size > 1) {
            return
        }
        const textDrag = textDragRef.current
        if (textDrag?.pointerId === event.pointerId) {
            const point = getInkPoint(event)
            if (!point) {
                return
            }

            setTexts((current) =>
                current.map((text) =>
                    text.id === textDrag.textId
                        ? {...text, x: point.x - textDrag.offsetX, y: point.y - textDrag.offsetY}
                        : text,
                ),
            )
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
            current.map((stroke) => (stroke.id === activeStroke.id ? {...activeStroke} : stroke)),
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

        if (textDragRef.current?.pointerId === event.pointerId) {
            textDragRef.current = null
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
    }

    const placeText = (point: StrokePoint) => {
        if (!pendingText) {
            return
        }

        setTexts((current) => [
            ...current,
            {
                color: penColor,
                createdAt: Date.now(),
                id: generateId(),
                opacity,
                page: pageNumber,
                size: Math.max(12, penWidth * 4),
                text: pendingText,
                x: point.x,
                y: point.y,
            },
        ])
        setPendingText('')
    }

    // @ts-ignore
    const t = TRANSLATIONS[lang]

    const renderToolbar = () => (
        <section
            className={`sec-1 sticky z-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 
            px-3 py-2 ${headerPosition === 'top' ? 'border-b shadow-sm' : 'border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)]'}`}>
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
                <div
                    className="relative flex items-center rounded-md border border-zinc-200 dark:border-zinc-800
    bg-white dark:bg-zinc-800 overflow-hidden">
                    <button
                        type="button"
                        aria-label={t.zoomOut}
                        className="relative z-10 inline-flex h-10 w-10 items-center justify-center text-zinc-700
        dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!hasBook || zoom <= MIN_ZOOM}
                        onClick={() => updateZoom(zoom - ZOOM_STEP)}
                    >
                        <Minus className="h-4 w-4"/>
                    </button>
                    <span
                        className="w-9 hidden sm:flex text-center text-sm font-medium tabular-nums dark:text-zinc-100">
                        {formatZoom(zoom)}
                    </span>
                    <button
                        type="button"
                        aria-label={t.zoomIn}
                        className="relative z-10 inline-flex h-10 w-10 items-center justify-center text-zinc-700
        dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!hasBook || zoom >= MAX_ZOOM}
                        onClick={() => updateZoom(zoom + ZOOM_STEP)}
                    >
                        <Plus className="h-4 w-4"/>
                    </button>
                </div>

                <div
                    className="flex flex-auto items-center justify-between rounded-md border border-zinc-200
                    dark:border-zinc-800 bg-white dark:bg-zinc-800">
                    <button
                        type="button"
                        aria-label={t.prevPage}
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-700
                        dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!hasBook || pageNumber <= 1}
                        onClick={() => setPageNumber((current) => current - 1)}
                    >
                        <ChevronLeft className="h-4 w-4 min-w-[16px]"/>
                    </button>
                    <button
                        type="button"
                        aria-label={t.nextPage}
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-700
                        dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!hasBook || pageNumber >= numPages}
                        onClick={() => setPageNumber((current) => current + 1)}
                    >
                        <ChevronRight className="h-4 w-4 flex-none"/>
                    </button>
                </div>
            </div>
        </section>
    )

    const hasBook = Boolean(pdf || epubDoc || imageDoc)

    return (
        <div
            className="flex h-svh bg-zinc-100 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100
            overflow-hidden relative">
            {/* Main Content Area */}
            <main
                className="flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950
                text-zinc-950 dark:text-zinc-100">
                {isLoading && (
                    <div
                        className="absolute inset-0 z-30 m-auto flex max-w-sm flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 p-8 text-center shadow-sm backdrop-blur-sm">
                        <div
                            className="flex items-center gap-3 px-6 py-3 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium text-sm shadow-md">
                            <div
                                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"/>
                            <span>{t.loading}</span>
                        </div>
                    </div>
                )}
                {isLoading ? (
                    <div
                        className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-zinc-800/70
                        text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {t.loading}
                    </div>
                ) : null}
                {headerPosition === 'top' && hasBook && renderToolbar()}

                <section id={'main-sec'}
                         className="relative flex flex-1 overflow-auto px-3 py-4 bg-[#ddd] dark:bg-zinc-900">
                    {!hasBook && !isLoading ? (
                        <div
                            className="m-auto flex max-w-sm flex-col items-center gap-4 rounded-lg border
                            border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center shadow-sm">
                        </div>
                    ) : (
                        <div className="mx-auto min-w-max pb-24">
                            <div
                                className="relative overflow-hidden rounded-md bg-white dark:bg-zinc-800
                                shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-700 mb-10"
                                style={{
                                    width: pageSize ? pageSize.width * zoom : undefined,
                                    height: pageSize ? pageSize.height * zoom : undefined,
                                }}
                            >
                                <canvas ref={pdfCanvasRef} className="absolute inset-0"/>
                                <canvas
                                    ref={inkCanvasRef}
                                    className={`absolute inset-0 ${tool === 'draw' || tool === 'numbering' ?
                                        'cursor-crosshair' : 'pointer-events-none'}`}
                                    style={{touchAction: tool === 'draw' || tool === 'numbering' ? 'none' : 'auto'}}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={finishStroke}
                                    onPointerCancel={finishStroke}
                                />
                                {isLoading ? (
                                    <div
                                        className="absolute inset-0 grid place-items-center bg-white/70
                                        dark:bg-zinc-800/70 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                        {t.loading}
                                    </div>
                                ) : null}
                                {pendingText ? (
                                    <div
                                        className="pointer-events-none absolute left-2 top-2 rounded
                                        bg-zinc-950/80 dark:bg-zinc-100/80 px-2 py-1 text-xs font-medium
                                        text-white dark:text-zinc-900">
                                        {t.tapToPlace}
                                    </div>
                                ) : null}
                            </div>
                            <div className={'h-10'}></div>
                        </div>
                    )}

                    {error ? (
                        <div
                            className={`fixed inset-x-3 z-30 rounded-md border border-red-200 
                            dark:border-red-900 bg-red-50 dark:bg-red-950/80 px-3 py-2 text-sm 
                            text-red-700 dark:text-red-300 shadow-lg transition-all duration-300 ${
                                headerPosition === 'bottom' ? 'bottom-[128px]' : 'bottom-3'}`}>
                            {error}
                        </div>
                    ) : null}
                </section>
                {headerPosition === 'bottom' && renderToolbar()}
            </main>
        </div>
    )
}

export default Page
