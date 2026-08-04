import {lazy, type PointerEvent, Suspense, useEffect, useMemo, useRef, useState} from 'react'
import {
    Brush,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Download,
    Eraser,
    Hand,
    Hash,
    Heart,
    Menu,
    Minus,
    Monitor,
    Moon,
    Plus,
    Settings,
    Sliders,
    Sun,
    Trash2,
    Type,
    Undo2,
    X,
} from 'lucide-react'
import type {PDFDocumentProxy, PDFPageProxy} from 'pdfjs-dist'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import Toast from "./components/Toast.tsx";
import {
    clamp,
    clearAllLocalData,
    deletePdfFromLibrary,
    type DeviceScreenInfo,
    DONATE_URL,
    drawStroke,
    drawTextAnnotation,
    findTextAtPoint,
    formatBytes,
    formatZoom,
    generateId,
    getAllPdfMetadata,
    getLibraryTotalSize,
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
    type Tool,
    ZOOM_STEP
} from './utils.ts'
import {TRANSLATIONS} from './translations.ts'

import NoPdf from "./components/NoPdf.tsx";
import {ThemeButtons} from "./components/ThemeButtons.tsx";
import {useOrientation} from "./hooks/useOrientation.ts";

const Sidebar = lazy(() => import('./components/Sidebar.tsx'));

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

function App() {
    const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const inkCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const activeStrokeRef = useRef<Stroke | null>(null)
    const activeStrokePointerRef = useRef<number | null>(null)
    const pointersRef = useRef<Map<number, PointerPosition>>(new Map())
    const pinchStateRef = useRef<PinchState | null>(null)
    const textDragRef = useRef<TextDragState | null>(null)
    const hasOpenedPdfRef = useRef(false)
    const {isPortrait} = useOrientation();
    console.log(`isPortrait = ${isPortrait}`)
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
    const [pdfName, setPdfName] = useState('')
    const [showTopBar, setStB] = useState(true)
    const [showToast, setShowToast] = useState('')
    const [pageNumber, setPageNumber] = useState(1)
    const [pageInput, setPageInput] = useState('1')
    const [pageSize, setPageSize] = useState<PageSize | null>(null)
    const [zoom, setZoom] = useState(1)

    const [theme, setTheme] = useState<'system' | 'light' | 'dark'>(() => {
        const saved = localStorage.getItem('pdf-theme')
        return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system'
    })

    function setTheme1(te: string) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.remove('light');
        if (te !== 'system') document.documentElement.classList.add(te);
        // @ts-ignore
        setTheme(te)
    }

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

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

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

    const [tool, setTool] = useState<string>(() => {
        const saved = localStorage.getItem('pdf-tool')
        return saved || 'draw'
    })

    const [strokes, setStrokes] = useState<Stroke[]>([])
    const [texts, setTexts] = useState<TextAnnotation[]>([])
    const [pendingText, setPendingText] = useState('')
    const [textDraft, setTextDraft] = useState('')
    const [penColor, setPenColor] = useState(PEN_COLORS[0])
    const [penWidth, setPenWidth] = useState(4)
    const [opacity, setOpacity] = useState(0.65)
    const [isPaintingEnabled, setIsPaintingEnabled] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [deviceScreenInfo, setDeviceScreenInfo] = useState<DeviceScreenInfo | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [isTextDialogOpen, setIsTextDialogOpen] = useState(false)
    const [localDataSize, setLocalDataSize] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [activePdfId, setActivePdfId] = useState<string | null>(null)
    const [pdfList, setPdfList] = useState<PdfMetadata[]>([])
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showBrushSettings, setShowBrushSettings] = useState(true)
    const [lang, setLang] = useState<Lang>(() => {
        const saved = localStorage.getItem('pdf-lang')
        return (saved === 'ru' || saved === 'en') ? saved : 'en'
    })

    const [isPinchZoomEnabled, setIsPinchZoomEnabled] = useState<boolean>(() => {
        const saved = localStorage.getItem('pdf-pinch-zoom')
        return saved !== null ? saved === 'true' : false // По умолчанию включено
    })

    useEffect(() => {
        localStorage.setItem('pdf-pinch-zoom', String(isPinchZoomEnabled))
    }, [isPinchZoomEnabled])

    useEffect(() => {
        localStorage.setItem('pdf-lang', lang)
    }, [lang])

    const [headerPosition, setHeaderPosition] = useState<'top' | 'bottom'>(() => {
        const saved = localStorage.getItem('pdf-header-position')
        return (saved === 'top' || saved === 'bottom') ? saved : 'top'
    })

    useEffect(() => {
        localStorage.setItem('pdf-header-position', headerPosition)
    }, [headerPosition])

    useEffect(() => {
        const update = () => setIsFullscreen(!!document.fullscreenElement)
        update()
        document.addEventListener('fullscreenchange', update)
        return () => document.removeEventListener('fullscreenchange', update)
    }, [])

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

    useEffect(() => {
        if (!isSettingsOpen) {
            return
        }

        const readInfo = () => {
            const orientation = (window.screen as any)?.orientation as
                | { type?: string; angle?: number }
                | undefined

            setDeviceScreenInfo({
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                availWidth: window.screen.availWidth,
                availHeight: window.screen.availHeight,
                devicePixelRatio: window.devicePixelRatio || 1,
                colorDepth: window.screen.colorDepth,
                pixelDepth: window.screen.pixelDepth,
                orientationType: orientation?.type,
                orientationAngle: orientation?.angle,
            })
        }

        readInfo()
        window.addEventListener('resize', readInfo)
        window.addEventListener('orientationchange', readInfo)
        return () => {
            window.removeEventListener('resize', readInfo)
            window.removeEventListener('orientationchange', readInfo)
        }
    }, [isSettingsOpen])

    const pageStrokes = useMemo(
        () => strokes.filter((stroke) => stroke.page === pageNumber),
        [pageNumber, strokes],
    )
    const pageTexts = useMemo(
        () => texts.filter((text) => text.page === pageNumber),
        [pageNumber, texts],
    )

    useEffect(() => {
        setPageInput(String(pageNumber))
    }, [pageNumber])

// Общая функция для создания объединенного Blob
    const getMergedBlob = () => {
        return new Promise((resolve) => {
            const c1 = pdfCanvasRef.current;
            const c2 = inkCanvasRef.current;
            if (!c1 || !c2) return resolve(null);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = c1.width;
            tempCanvas.height = c1.height;
            const ctx = tempCanvas.getContext('2d');
            // @ts-ignore
            ctx.fillStyle = resolvedTheme === 'dark' ? '#18181b' : '#ffffff';
            // @ts-ignore
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            // @ts-ignore
            ctx.drawImage(c1, 0, 0);
            // @ts-ignore
            ctx.drawImage(c2, 0, 0);

            tempCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
        });
    };

    const handleDownload = async () => {
        const blob = await getMergedBlob();
        if (!blob) return;

        // @ts-ignore
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `merged-canvas${pageNumber}.jpg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

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
                throw new Error('PDF metadata not found.')
            }
            const data = await getPdfFile(id)

            await openPdfData(data, metadata.name, {
                clearStrokes: true,
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
            setError(err instanceof Error ? err.message : 'Failed to load PDF.')
        } finally {
            setIsLoading(false)
        }
    }

    const closeActiveDocument = () => {
        cancelActiveStroke()
        pointersRef.current.clear()
        pinchStateRef.current = null
        textDragRef.current = null
        setPdf(null)
        setPdfName('')
        setPageNumber(1)
        setPageInput('1')
        setZoom(1)
        setStrokes([])
        setTexts([])
        setPendingText('')
        setTextDraft('')
        setPageSize(null)
        setError('')
        hasOpenedPdfRef.current = false
        setActivePdfId(null)
        localStorage.removeItem('active-pdf-id')
    }

    const handleDeletePdf = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation()
        const metadata = pdfList.find((item) => item.id === id)
        const name = metadata?.name || 'this PDF'
        const shouldDelete = window.confirm(t.deleteConfirm.replace('{name}', name))
        if (!shouldDelete) {
            return
        }

        try {
            await deletePdfFromLibrary(id)
            const list = await getAllPdfMetadata()
            setPdfList(list)

            if (activePdfId === id) {
                if (list.length > 0) {
                    await loadPdfFromLibrary(list[0].id)
                } else {
                    closeActiveDocument()
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete PDF.')
        }
    }

    useEffect(() => {
        let isCancelled = false

        const initApp = async () => {
            if (!('indexedDB' in window)) {
                // setIsLoading(false)
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
                    // await timeout(5)
                    if (list) setIsLoading(false)
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
        if (!activePdfId || !pdf || !hasOpenedPdfRef.current) {
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
    }, [activePdfId, isPaintingEnabled, opacity, pageNumber, pdf, penColor, penWidth, strokes, texts, zoom])

    useEffect(() => {
        if (!isSettingsOpen) {
            return
        }

        void refreshLocalDataSize()
    }, [isSettingsOpen])

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

                const viewport = page.getViewport({scale: zoom})
                const baseViewport = page.getViewport({scale: 1})
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
                    setPageSize({width: baseViewport.width, height: baseViewport.height})
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
        for (const text of pageTexts) {
            drawTextAnnotation(context, text)
        }
    }, [pageSize, pageStrokes, pageTexts, zoom])

    const openPdfData = async (
        data: ArrayBuffer,
        name: string,
        options: {
            clearStrokes: boolean
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
            setPageNumber(clamp(options.pageNumber ?? 1, 1, nextPdf.numPages))
            setZoom(clamp(options.zoom ?? 1, MIN_ZOOM, MAX_ZOOM))
            if (options.clearStrokes) {
                setStrokes(options.strokes ?? [])
                setTexts(options.texts ?? [])
            }
            hasOpenedPdfRef.current = true
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Could not open this PDF.')
        } finally {
            setIsLoading(false)
        }
    }

    const loadPdfFromUrl = async (url: string, fileName?: string) => {
        // console.log('a', url)
        try {
            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.statusText}`)
            }

            const data = await response.arrayBuffer()
            const nextId = generateId()

            // Fallback filename extracted from URL if not provided
            const name = fileName || url.split('/').pop()?.split('?')[0] || 'document.pdf'

            await savePdfToLibrary(nextId, name, data)
            await refreshPdfList()
            await loadPdfFromLibrary(nextId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load PDF from URL.')
        }
    }

    const loadPdf = async (file: File) => {
        try {
            const data = await file.arrayBuffer()
            const nextId = generateId()
            await savePdfToLibrary(nextId, file.name, data)
            await refreshPdfList()
            await loadPdfFromLibrary(nextId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load PDF.')
        }
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
        if (!isPinchZoomEnabled) return

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

    const undoPageStroke = () => {
        const lastPageStroke = [...strokes].reverse().find((stroke) => stroke.page === pageNumber)
        const lastPageText = [...texts].reverse().find((text) => text.page === pageNumber)
        if (!lastPageStroke && !lastPageText) {
            return
        }

        const strokeCreatedAt = lastPageStroke?.createdAt ?? 0
        const textCreatedAt = lastPageText?.createdAt ?? 0

        if (lastPageText && textCreatedAt >= strokeCreatedAt) {
            setTexts((current) => current.filter((text) => text.id !== lastPageText.id))
            return
        }

        setStrokes((current) => current.filter((stroke) => stroke.id !== lastPageStroke?.id))
    }

    const clearPage = () => {
        setStrokes((current) => current.filter((stroke) => stroke.page !== pageNumber))
        setTexts((current) => current.filter((text) => text.page !== pageNumber))
    }

    const refreshLocalDataSize = async () => {
        try {
            setLocalDataSize(await getLibraryTotalSize())
        } catch (storageError) {
            setLocalDataSize(null)
            setError(storageError instanceof Error ? storageError.message : 'Could not read local storage size.')
        }
    }

    const deleteLocalData = async () => {
        const shouldDelete = window.confirm(t.confirmClearAll)
        if (!shouldDelete) {
            return
        }

        cancelActiveStroke()
        pointersRef.current.clear()
        pinchStateRef.current = null
        hasOpenedPdfRef.current = false
        setPdf(null)
        setPdfName('')
        setPageNumber(1)
        setPageInput('1')
        setZoom(1)
        setStrokes([])
        setTexts([])
        setPendingText('')
        setTextDraft('')
        setPageSize(null)
        setActivePdfId(null)
        setPdfList([])
        await clearAllLocalData()
        setLocalDataSize(0)
        setIsSettingsOpen(false)
        localStorage.removeItem('active-pdf-id')
    }

    const changeTool = (nextTool: Tool) => {
        cancelActiveStroke()
        pointersRef.current.clear()
        pinchStateRef.current = null
        textDragRef.current = null
        setTool(nextTool)
        localStorage.setItem('pdf-tool', nextTool)
    }

    const openTextDialog = () => {
        setTextDraft(pendingText)
        setIsTextDialogOpen(true)
    }

    const armTextPlacement = () => {
        const trimmedText = textDraft.trim()
        setIsTextDialogOpen(false)

        if (!trimmedText) {
            setPendingText('')
            return
        }

        setPendingText(trimmedText)
        changeTool('draw')
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

    // @ts-ignore
    const t = TRANSLATIONS[lang]

    function getLang(tStr: any) {
        const defLang = TRANSLATIONS['en']
        // @ts-ignore
        return t[tStr] || defLang[tStr]
    }

    const fullscreenSupported =
        typeof document !== 'undefined' &&
        typeof document.fullscreenEnabled === 'boolean' &&
        document.fullscreenEnabled

    const deviceScreenInfoText = deviceScreenInfo
        ? [
            `Viewport: ${deviceScreenInfo.viewportWidth}×${deviceScreenInfo.viewportHeight}`,
            `Screen: ${deviceScreenInfo.screenWidth}×${deviceScreenInfo.screenHeight} (avail ${deviceScreenInfo.availWidth}×${deviceScreenInfo.availHeight})`,
            `Outer: ${deviceScreenInfo.outerWidth}×${deviceScreenInfo.outerHeight}`,
            `DPR: ${deviceScreenInfo.devicePixelRatio}`,
            `Color depth: ${deviceScreenInfo.colorDepth ?? '—'} | Pixel depth: ${deviceScreenInfo.pixelDepth ?? '—'}`,
            `Orientation: ${deviceScreenInfo.orientationType ?? '—'}${
                deviceScreenInfo.orientationAngle != null ? ` (${deviceScreenInfo.orientationAngle}°)` : ''
            }`,
        ].join('\n')
        : '...'

    const openToFullscreen = async () => {
        setError('')
        setIsSettingsOpen(false)

        try {
            if (!fullscreenSupported) {
                setError(t.fullscreenUnavailable)
                return
            }

            if (document.fullscreenElement) {
                await document.exitFullscreen()
                return
            }

            await document.documentElement.requestFullscreen()
        } catch {
            setError(t.fullscreenError)
        }
    }

    const renderHeader = (position: 'top' | 'bottom') => (showTopBar || isPortrait) && (
        <header
            className={`sticky ${position === 'top' ? 'top-0 border-b shadow-sm' : 'bottom-0 border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)]'} z-20 border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 px-3 py-2 backdrop-blur shrink-0`}>
            <div className="mx-auto flex max-w-5xl items-center gap-2">
                <button
                    aria-label="Toggle sidebar"
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                    onClick={() => setIsSidebarOpen((prev) => !prev)}
                >
                    <Menu className="h-5 w-5"/>
                </button>

                <div className="pdf-name-div min-w-0 flex-1 flex justify-between">
                    <div className="pdf-name-div min-w-0 flex-1">
                        <p className="truncate text-sm font-medium dark:text-zinc-100" onClick={
                            () => setShowToast(pdfName)
                        }>{pdfName || t.emptyHeader}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {pdf ? `${t.savedLocally} - ${pdf.numPages} ${t.pages}` : t.selectOrUpload}
                        </p>
                    </div>
                </div>
                <div className="cursor-pointer text-zinc-700 dark:text-zinc-200 hover:opacity-80"
                     onClick={handleDownload}><Download/></div>
                {/*<div onClick={downPage}><Share/></div>*/}
                <form
                    className="pageinfo-div flex h-10 items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-2"
                    onSubmit={(event) => {
                        event.preventDefault()
                        goToPage()
                    }}
                >
                    <Hash className="h-4 w-4 text-zinc-500 dark:text-zinc-400"/>
                    <input
                        aria-label={t.goToPage}
                        className="h-8 w-14 bg-transparent text-center text-sm font-medium tabular-nums text-zinc-950 dark:text-zinc-100 outline-none"
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
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">/ {pdf?.numPages ?? 0}</span>
                </form>
                <button
                    type="button"
                    aria-label={t.settings}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95"
                    onClick={() => setIsSettingsOpen(true)}
                >
                    <Settings className="h-5 w-5"/>
                </button>
            </div>
        </header>
    )

    const renderToolbar = () => (
        <section
            className={`sec-1 sticky z-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 ${headerPosition === 'top' ? 'top-[57px]_ border-b shadow-sm' : 'bottom-[57px]_ border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)]'}`}>
            <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
                <div
                    className="flex rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 p-1 gap-0.5">
                    <button
                        type="button"
                        aria-label={t.drawMode}
                        className={`inline-flex h-9 w-10 items-center justify-center rounded ${tool === 'draw' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                        onClick={() => changeTool('draw')}
                    >
                        <Brush className="h-4 w-4"/>
                    </button>
                    <button
                        type="button"
                        aria-label={t.moveMode}
                        className={`inline-flex h-9 w-10 items-center justify-center rounded ${tool === 'move' ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                        onClick={() => changeTool('move')}
                    >
                        <Hand className="h-4 w-4"/>
                    </button>
                </div>
                <button
                    type="button"
                    aria-label={t.insertText}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600 ${pendingText ? 'ring-2 ring-zinc-950 dark:ring-zinc-100' : ''}`}
                    disabled={!pdf}
                    onClick={openTextDialog}
                >
                    <Type className="h-4 w-4"/>
                </button>

                <div
                    className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800">
                    <button
                        type="button"
                        aria-label={t.zoomOut}
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!pdf || zoom <= MIN_ZOOM}
                        onClick={() => updateZoom(zoom - ZOOM_STEP)}
                    >
                        <Minus className="h-4 w-4"/>
                    </button>
                    <span
                        className="w-9 text-center text-sm font-medium tabular-nums dark:text-zinc-100">{formatZoom(zoom)}</span>
                    <button
                        type="button"
                        aria-label={t.zoomIn}
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!pdf || zoom >= MAX_ZOOM}
                        onClick={() => updateZoom(zoom + ZOOM_STEP)}
                    >
                        <Plus className="h-4 w-4"/>
                    </button>
                </div>

                <div
                    className="flex flex-auto items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800">
                    <button
                        type="button"
                        aria-label={t.prevPage}
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!pdf || pageNumber <= 1}
                        onClick={() => setPageNumber((current) => current - 1)}
                    >
                        <span className={'hidden text-xs p-1'}>prev page</span>
                        <ChevronLeft className="h-4 w-4 min-w-[16px]"/>
                    </button>
                    <button
                        type="button"
                        aria-label={t.nextPage}
                        className="inline-flex h-10 w-10 items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                        disabled={!pdf || pageNumber >= pdf.numPages}
                        onClick={() => setPageNumber((current) => current + 1)}
                    >
                        <ChevronRight className="h-4 w-4 flex-none"/>
                        <span className={'hidden text-xs p-1'}>next page</span>
                    </button>
                </div>
                <button
                    type="button"
                    aria-label={t.nextPage}
                    className="hidden min-[500px]:inline-flex h-10 w-10 items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                    onClick={() => setStB(!showTopBar)}
                >
                    {headerPosition === 'top' && (
                        <>
                            {(showTopBar) ? <ChevronUp className="h-4 w-4 flex-none"/> :
                                <ChevronDown className="h-4 w-4 flex-none"/>}
                        </>
                    )}
                    {headerPosition === 'bottom' && (
                        <>
                            {(showTopBar) ? <ChevronDown className="h-4 w-4 flex-none"/> :
                                <ChevronUp className="h-4 w-4 flex-none"/>}
                        </>
                    )}
                    <span className={'hidden text-xs p-1'}>next page</span>
                </button>
                {tool === 'draw' && (
                    <>
                        <button
                            type="button"
                            aria-label={t.toggleBrushSettings}
                            className={`inline-flex h-9 w-10 items-center justify-center rounded transition-colors ${showBrushSettings ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-950 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'}`}
                            onClick={() => setShowBrushSettings((prev) => !prev)}
                        >
                            <Sliders className="h-4 w-4"/>
                        </button>
                        <button
                            type="button"
                            aria-label={t.undo}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                            disabled={!pageStrokes.length && !pageTexts.length}
                            onClick={undoPageStroke}
                        >
                            <Undo2 className="h-4 w-4"/>
                        </button>
                        <button
                            type="button"
                            aria-label={t.clearPage}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:text-zinc-300 dark:disabled:text-zinc-600"
                            disabled={!pageStrokes.length && !pageTexts.length}
                            onClick={clearPage}
                        >
                            <Trash2 className="h-4 w-4"/>
                        </button>
                    </>
                )}
            </div>
        </section>
    )

    const renderBrushSettings = () => {
        if (tool !== 'draw' || !showBrushSettings) return null
        return (
            <section
                className={`border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 ${headerPosition === 'top' ? 'border-b shadow-sm' : 'border-t shadow-[0_-1px_3px_rgba(0,0,0,0.05)]'}`}>
                <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                        {PEN_COLORS.map((color) => (
                            <button
                                type="button"
                                key={color}
                                aria-label={`${t.useColor} ${color}`}
                                className={`h-8 w-8 rounded-full border-2 ${penColor === color ? 'border-zinc-950 dark:border-zinc-100' : 'border-zinc-200 dark:border-zinc-700'}`}
                                style={{backgroundColor: color}}
                                onClick={() => setPenColor(color)}
                            />
                        ))}
                    </div>

                    <label
                        className="flex min-w-32 flex-1 items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Brush className="h-4 w-4 shrink-0" aria-hidden="true"/>
                        <input
                            aria-label={t.penSize}
                            type="range"
                            min="1"
                            max="14"
                            value={penWidth}
                            className="w-full accent-zinc-950 dark:accent-zinc-100"
                            onChange={(event) => setPenWidth(Number(event.target.value))}
                        />
                    </label>

                    <label
                        className="flex min-w-32 flex-1 items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        <Eraser className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true"/>
                        <input
                            aria-label={t.opacity}
                            type="range"
                            min="0.2"
                            max="1"
                            step="0.05"
                            value={opacity}
                            className="w-full accent-zinc-950 dark:accent-zinc-100"
                            onChange={(event) => setOpacity(Number(event.target.value))}
                        />
                    </label>
                </div>
            </section>
        )
    }

    return (
        <div
            className="flex h-svh bg-zinc-100 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100 overflow-hidden relative">
            {/* Sidebar overlay backdrop for mobile */}
            {pdf && isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-zinc-950/20 dark:bg-zinc-950/40 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            {pdf && (
                <Suspense fallback={<div
                    className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"/>}>
                    <Sidebar
                        isOpen={isSidebarOpen}
                        setIsOpen={setIsSidebarOpen}
                        t={t}
                        pdfList={pdfList}
                        activePdfId={activePdfId}
                        loadPdf={loadPdf}
                        loadPdfFromUrl={loadPdfFromUrl}
                        loadPdfFromLibrary={loadPdfFromLibrary}
                        handleDeletePdf={handleDeletePdf}
                    />
                </Suspense>
            )}

            {/* Main Content Area */}
            <main
                className="flex flex-1 flex-col h-full min-w-0 overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-950 dark:text-zinc-100">
                {isLoading ? (
                    <div
                        className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-zinc-800/70 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {t.loading}
                    </div>
                ) : null}
                {headerPosition === 'top' && pdf && renderHeader('top')}
                {headerPosition === 'top' && pdf && renderToolbar()}
                {headerPosition === 'top' && pdf && renderBrushSettings()}

                <section id={'main-sec'}
                         className="relative flex flex-1 overflow-auto px-3 py-4 bg-[#ddd] dark:bg-zinc-900">
                    {!pdf && !isLoading ? (
                        <div
                            className="m-auto flex max-w-sm flex-col items-center gap-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center shadow-sm">
                            <NoPdf
                                t={t}
                                loadPdf={loadPdf}
                                loadPdfFromUrl={loadPdfFromUrl}
                            />
                        </div>
                    ) : (
                        <div className="mx-auto min-w-max pb-24">
                            <div
                                className="relative overflow-hidden rounded-md bg-white dark:bg-zinc-800 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-700 mb-10"
                                style={{
                                    width: pageSize ? pageSize.width * zoom : undefined,
                                    height: pageSize ? pageSize.height * zoom : undefined,
                                }}
                            >
                                <canvas ref={pdfCanvasRef} className="absolute inset-0"/>
                                <canvas
                                    ref={inkCanvasRef}
                                    className={`absolute inset-0 ${tool === 'draw' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                                    style={{touchAction: tool === 'draw' ? 'none' : 'auto'}}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={finishStroke}
                                    onPointerCancel={finishStroke}
                                />
                                {isLoading ? (
                                    <div
                                        className="absolute inset-0 grid place-items-center bg-white/70 dark:bg-zinc-800/70 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                        {t.loading}
                                    </div>
                                ) : null}
                                {pendingText ? (
                                    <div
                                        className="pointer-events-none absolute left-2 top-2 rounded bg-zinc-950/80 dark:bg-zinc-100/80 px-2 py-1 text-xs font-medium text-white dark:text-zinc-900">
                                        {t.tapToPlace}
                                    </div>
                                ) : null}
                            </div>
                            <div className={'h-10'}></div>
                        </div>
                    )}

                    {error ? (
                        <div
                            className={`fixed inset-x-3 z-30 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/80 px-3 py-2 text-sm text-red-700 dark:text-red-300 shadow-lg transition-all duration-300 ${headerPosition === 'bottom' ? 'bottom-[128px]' : 'bottom-3'}`}>
                            {error}
                        </div>
                    ) : null}
                </section>
                {headerPosition === 'bottom' && renderBrushSettings()}
                {headerPosition === 'bottom' && renderToolbar()}
                {headerPosition === 'bottom' && renderHeader('bottom')}
                {isSettingsOpen ? (
                    <div
                        className="fixed inset-0 z-40 flex items-end bg-black/30 dark:bg-black/60 p-3 sm:items-center sm:justify-center">
                        <section
                            className="w-full rounded-lg bg-white dark:bg-zinc-900 p-4 shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 sm:max-w-sm flex flex-col max-h-[85vh]">
                            <div
                                className="flex items-center justify-between gap-3 shrink-0 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                                <h2 className="text-base font-semibold dark:text-zinc-100">{t.settings}</h2>
                                <button
                                    type="button"
                                    aria-label={t.settings}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                                    onClick={() => setIsSettingsOpen(false)}
                                >
                                    <X className="h-4 w-4"/>
                                </button>
                            </div>
                            <p className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
                                Last
                                {/* @ts-ignore */}
                                update: {__APP_VERSION__}, {localDataSize === null ? '...' : formatBytes(localDataSize)}
                            </p>
                            <div className="mt-4 overflow-y-auto flex-1 pr-1 space-y-3">
                                <ThemeButtons
                                    options={[
                                        {value: 'system', label: 'Auto', icon: Monitor},
                                        {value: 'light', label: 'Light', icon: Sun},
                                        {value: 'dark', label: 'Dark', icon: Moon},
                                    ]}
                                    theme={theme}
                                    setTheme={setTheme1}
                                    resolvedTheme={resolvedTheme}
                                />
                                <ThemeButtons
                                    options={[
                                        {value: 'en', label: 'English', icon: Monitor},
                                        {value: 'ru', label: 'Russian', icon: Monitor},
                                        {value: 'th', label: 'Thai', icon: Monitor},
                                        {value: 'zh', label: 'Chinese', icon: Monitor},
                                    ]}
                                    label={'Choose language'}
                                    theme={lang}
                                    setTheme={(t: string) => setLang(t as Lang)}
                                    resolvedTheme={resolvedTheme}
                                />
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 transition-all disabled:text-zinc-500 dark:disabled:text-zinc-500 disabled:bg-white dark:disabled:bg-zinc-800 disabled:hover:bg-white dark:disabled:hover:bg-zinc-800"
                                    disabled={!fullscreenSupported}
                                    onClick={() => void openToFullscreen()}
                                >
                                    {isFullscreen ? t.exitFullscreen : t.openFullscreen}
                                </button>

                                <div
                                    className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.deviceScreenInfo}</p>
                                    <pre
                                        className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {deviceScreenInfoText}
                  </pre>
                                </div>
                                <label
                                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                    <span
                                        className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{getLang('pinchToZoomOn')}</span>
                                    <input
                                        checked={isPinchZoomEnabled}
                                        className="h-5 w-5 accent-zinc-950 dark:accent-zinc-100"
                                        type="checkbox"
                                        onChange={(event) => {
                                            setIsPinchZoomEnabled(event.target.checked)
                                        }}
                                    />
                                </label>
                                <label
                                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                    <span
                                        className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{t.painting}</span>
                                    <input
                                        checked={isPaintingEnabled}
                                        className="h-5 w-5 accent-zinc-950 dark:accent-zinc-100"
                                        type="checkbox"
                                        onChange={(event) => {
                                            if (!event.target.checked) {
                                                cancelActiveStroke()
                                            }
                                            setIsPaintingEnabled(event.target.checked)
                                        }}
                                    />
                                </label>

                                <div
                                    className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t.headerPosition}</p>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            type="button"
                                            className={`flex-1 rounded-md py-2 px-3 text-xs font-semibold border transition-all ${
                                                headerPosition === 'top'
                                                    ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-sm'
                                                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
                                            }`}
                                            onClick={() => setHeaderPosition('top')}
                                        >
                                            {t.headerTop}
                                        </button>
                                        <button
                                            type="button"
                                            className={`flex-1 rounded-md py-2 px-3 text-xs font-semibold border transition-all ${
                                                headerPosition === 'bottom'
                                                    ? 'bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-950 dark:border-zinc-100 shadow-sm'
                                                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
                                            }`}
                                            onClick={() => setHeaderPosition('bottom')}
                                        >
                                            {t.headerBottom}
                                        </button>
                                    </div>
                                </div>

                                {pdf ? (
                                    <button
                                        type="button"
                                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                                        onClick={() => {
                                            const shouldClose = window.confirm(t.confirmClosePdf)
                                            if (shouldClose) {
                                                closeActiveDocument()
                                                setIsSettingsOpen(false)
                                            }
                                        }}
                                    >
                                        <X className="h-4 w-4"/>
                                        {t.closePdf}
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-800 hover:bg-red-700 active:scale-95 transition-all"
                                    disabled={!localDataSize}
                                    onClick={() => void deleteLocalData()}
                                >
                                    <Trash2 className="h-4 w-4"/>
                                    {t.deleteLocalData}
                                </button>

                                <hr className="my-2 border-zinc-100 dark:border-zinc-800"/>

                                <details
                                    className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-3 select-none group">
                                    <summary
                                        className="flex cursor-pointer items-center justify-between text-sm font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none">
                                        <span>{t.aboutTitle}</span>
                                        <ChevronRight
                                            className="h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-transform group-open:rotate-90"/>
                                    </summary>
                                    <div
                                        className="mt-3 text-xs text-zinc-700 dark:text-zinc-300 space-y-2 border-t border-zinc-200/60 dark:border-zinc-800 pt-3 select-text leading-relaxed">
                                        <p>{t.aboutDesc}</p>
                                        <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-2">{t.featuresTitle}:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li>{t.featureDraw}</li>
                                            <li>{t.featureText}</li>
                                            <li>{t.featureLocal}</li>
                                        </ul>
                                        <p className="rounded bg-zinc-100 dark:bg-zinc-800 p-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mt-2">
                                            {t.privacyNote}
                                        </p>
                                    </div>
                                </details>

                                <div
                                    className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-rose-50/30 dark:bg-rose-950/20 p-3 text-center">
                                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.donateTitle}</p>
                                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">{t.donateDesc}</p>
                                    <a
                                        href={DONATE_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2.5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-rose-50 dark:bg-rose-950/40 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 active:scale-95 transition-all"
                                    >
                                        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500"/>
                                        <span>{t.donateBtn}</span>
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : null}

                {isTextDialogOpen ? (
                    <div
                        className="fixed inset-0 z-40 flex items-end bg-black/30 dark:bg-black/60 p-3 sm:items-center sm:justify-center">
                        <section
                            className="w-full rounded-lg bg-white dark:bg-zinc-900 p-4 shadow-2xl ring-1 ring-zinc-200 dark:ring-zinc-800 sm:max-w-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-semibold dark:text-zinc-100">{t.insertText}</h2>
                                <button
                                    type="button"
                                    aria-label={t.insertText}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
                                    onClick={() => setIsTextDialogOpen(false)}
                                >
                                    <X className="h-4 w-4"/>
                                </button>
                            </div>

                            <textarea
                                autoFocus
                                className="mt-4 min-h-28 w-full resize-none rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 p-3 text-base outline-none focus:border-zinc-950 dark:focus:border-zinc-100"
                                value={textDraft}
                                onChange={(event) => setTextDraft(event.target.value)}
                            />

                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-200"
                                    onClick={() => setIsTextDialogOpen(false)}
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-zinc-950 dark:bg-zinc-100 px-4 text-sm font-medium text-white dark:text-zinc-900"
                                    onClick={armTextPlacement}
                                >
                                    {t.ok}
                                </button>
                            </div>
                        </section>
                    </div>
                ) : null}
            </main>
            {showToast && (
                <Toast
                    message={showToast}
                    type="success"
                    onClose={() => setShowToast('')}
                />
            )}
            {pdf && (
                <div
                    className={`rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 fixed p-2_  bottom-2 right-2 ${tool === 'draw' ? '' : ''}`}
                >
                    <button
                        type="button"
                        aria-label={t.moveMode}
                        className={`inline-flex h-9 w-10 items-center justify-center rounded ${tool === 'move' ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
                        onClick={() => changeTool(tool === 'move' ? 'draw' : 'move')}
                    >
                        {tool === 'move' ? <Brush className="h-4 w-4"/> : <Hand className="h-4 w-4"/>}
                    </button>
                </div>
            )}
        </div>
    )
}

export default App
