
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

export type Lang = 'en' | 'ru'

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

export const  TRANSLATIONS = {
    en: {
        libraryTitle: 'PDF Library',
        addPdf: 'Add PDF',
        addExPdf: 'load example pdf',
        emptyLibrary: 'Library is empty',
        emptyLibrarySub: 'Upload a file to get started',
        drawings: 'Drawings',
        texts: 'Texts',
        pageShort: 'Pg',
        deleteConfirm: 'Delete "{name}" and all drawings/annotations?',
        confirmClearAll: 'Delete the entire PDF library and all drawings?',
        emptyHeader: 'Library is empty',
        selectOrUpload: 'Select or upload a PDF file',
        closePdf: 'Close PDF',
        settings: 'Settings',
        drawMode: 'Draw mode',
        moveMode: 'Move mode',
        toggleBrushSettings: 'Toggle brush settings',
        insertText: 'Insert text',
        zoomOut: 'Zoom out',
        zoomIn: 'Zoom in',
        prevPage: 'Previous page',
        nextPage: 'Next page',
        goToPage: 'Go to page',
        undo: 'Undo',
        clearPage: 'Clear page',
        tapToPlace: 'Tap to place text',
        loading: 'Loading',
        localData: 'Local data',
        painting: 'Painting',
        deleteLocalData: 'Delete local data',
        cancel: 'Cancel',
        ok: 'OK',
        useColor: 'Use pen color',
        penSize: 'Pen size',
        opacity: 'Opacity',
        savedLocally: 'Saved',
        pages: 'pages',
        confirmClosePdf: 'Close the current PDF?',
        aboutTitle: 'About PDF Learn',
        aboutDesc: 'PDF Learn is a secure, fast, and completely free tool for editing PDFs directly in your browser. Draw, write, sign, and annotate documents without installing any software.',
        privacyNote: '100% Private: All processing happens locally on your device. Your documents are never uploaded to any server.',
        featuresTitle: 'Key Features',
        featureDraw: 'Draw & Sketch: Mark up files with custom pen color, thickness, and opacity.',
        featureText: 'Add Text: Insert text blocks anywhere to fill forms or leave comments.',
        featureLocal: 'Local Library: Save documents and annotations securely in your browser\'s local database.',
        donateTitle: 'Support the project',
        donateBtn: 'Support with Donation',
        donateDesc: 'If PDF Learn was helpful to you, consider supporting the developer!',
        headerPosition: 'Header Position',
        headerTop: 'Show header at top',
        headerBottom: 'Show header at bottom',
        deviceScreenInfo: 'Device screen info',
        openFullscreen: 'Open to fullscreen',
        exitFullscreen: 'Exit fullscreen',
        fullscreenUnavailable: 'Fullscreen is not supported in this browser.',
        fullscreenError: 'Could not open fullscreen.',
    },
    ru: {
        libraryTitle: 'Библиотека PDF',
        addPdf: 'Добавить PDF',
        addExPdf: 'Тестовый PDF',
        emptyLibrary: 'Библиотека пуста',
        emptyLibrarySub: 'Загрузите файл для начала работы',
        drawings: 'Рисунков',
        texts: 'Текста',
        pageShort: 'Стр',
        deleteConfirm: 'Удалить "{name}" и все рисунки/аннотации?',
        confirmClearAll: 'Удалить всю библиотеку PDF и все рисунки?',
        emptyHeader: 'Библиотека пуста',
        selectOrUpload: 'Выберите или загрузите PDF файл',
        closePdf: 'Закрыть PDF',
        settings: 'Настройки',
        drawMode: 'Режим рисования',
        moveMode: 'Режим перемещения',
        toggleBrushSettings: 'Настройки кисти',
        insertText: 'Вставить текст',
        zoomOut: 'Уменьшить',
        zoomIn: 'Увеличить',
        prevPage: 'Предыдущая страница',
        nextPage: 'Следующая страница',
        goToPage: 'Перейти к странице',
        undo: 'Отменить действие',
        clearPage: 'Очистить страницу',
        tapToPlace: 'Нажмите, чтобы разместить текст',
        loading: 'Загрузка',
        localData: 'Локальные данные',
        painting: 'Рисование',
        deleteLocalData: 'Удалить всю библиотеку',
        cancel: 'Отмена',
        ok: 'OK',
        useColor: 'Выбрать цвет кисти',
        penSize: 'Размер кисти',
        opacity: 'Прозрачность',
        savedLocally: 'Сохранено локально',
        pages: 'страниц',
        confirmClosePdf: 'Закрыть текущий PDF?',
        aboutTitle: 'О сервисе PDF Learn',
        aboutDesc: 'PDF Learn — это конфиденциальный, быстрый и бесплатный инструмент для редактирования PDF прямо в браузере. Рисуйте, пишите, подписывайте и аннотируйте документы без установки каких-либо программ.',
        privacyNote: '100% Конфиденциально: Все операции выполняются локально на вашем устройстве. Ваши документы никогда не загружаются на сервер.',
        featuresTitle: 'Основные возможности',
        featureDraw: 'Рисование: Выделяйте главное, рисуйте схемы или подписывайте документы.',
        featureText: 'Вставка текста: Добавляйте печатные заметки и заполняйте формы.',
        featureLocal: 'Локальная база: Сохраняйте документы и историю правок прямо в браузере.',
        donateTitle: 'Поддержать проект',
        donateBtn: 'Поддержать автора',
        donateDesc: 'Если PDF Learn оказался вам полезен, вы можете поддержать разработчика!',
        headerPosition: 'Положение шапки',
        headerTop: 'Показывать шапку вверху',
        headerBottom: 'Показывать шапку внизу',
        deviceScreenInfo: 'Информация об экране устройства',
        openFullscreen: 'Открыть на весь экран',
        exitFullscreen: 'Выйти из полноэкранного режима',
        fullscreenUnavailable: 'Полноэкранный режим не поддерживается в этом браузере.',
        fullscreenError: 'Не удалось открыть полноэкранный режим.',
    },
    th: {
        libraryTitle: 'คลัง PDF',
        addPdf: 'เพิ่ม PDF',
        addExPdf: 'โหลดไฟล์ PDF ตัวอย่าง',
        emptyLibrary: 'คลังว่างเปล่า',
        emptyLibrarySub: 'อัปโหลดไฟล์เพื่อเริ่มต้นใช้งาน',
        drawings: 'ภาพวาด',
        texts: 'ข้อความ',
        pageShort: 'หน้า',
        deleteConfirm: 'ลบ "{name}" และภาพวาด/คำอธิบายประกอบทั้งหมดหรือไม่?',
        confirmClearAll: 'ลบคลัง PDF ทั้งหมดและภาพวาดทั้งหมดหรือไม่?',
        emptyHeader: 'คลังว่างเปล่า',
        selectOrUpload: 'เลือกหรืออัปโหลดไฟล์ PDF',
        closePdf: 'ปิด PDF',
        settings: 'การตั้งค่า',
        drawMode: 'โหมดวาดภาพ',
        moveMode: 'โหมดเลื่อน',
        toggleBrushSettings: 'สลับการตั้งค่าพู่กัน',
        insertText: 'แทรกข้อความ',
        zoomOut: 'ย่อ',
        zoomIn: 'ขยาย',
        prevPage: 'หน้าก่อนหน้า',
        nextPage: 'หน้าถัดไป',
        goToPage: 'ไปที่หน้า',
        undo: 'เลิกทำ',
        clearPage: 'ล้างหน้า',
        tapToPlace: 'แตะเพื่อวางข้อความ',
        loading: 'กำลังโหลด',
        localData: 'ข้อมูลในเครื่อง',
        painting: 'การวาด',
        deleteLocalData: 'ลบข้อมูลในเครื่อง',
        cancel: 'ยกเลิก',
        ok: 'ตกลง',
        useColor: 'ใช้สีปากกา',
        penSize: 'ขนาดปากกา',
        opacity: 'ความทึบ',
        savedLocally: 'บันทึกแล้ว',
        pages: 'หน้า',
        confirmClosePdf: 'ปิด PDF ปัจจุบันหรือไม่?',
        aboutTitle: 'เกี่ยวกับ PDF Learn',
        aboutDesc: 'PDF Learn เป็นเครื่องมือที่ปลอดภัย รวดเร็ว และฟรีทั้งหมดสำหรับแก้ไข PDF โดยตรงในเบราว์เซอร์ของคุณ วาด เขียน เซ็นชื่อ และใส่คำอธิบายประกอบเอกสารโดยไม่ต้องติดตั้งซอฟต์แวร์ใดๆ',
        privacyNote: 'ความเป็นส่วนตัว 100%: การประมวลผลทั้งหมดเกิดขึ้นบนอุปกรณ์ของคุณ เอกสารของคุณจะไม่ถูกอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ',
        featuresTitle: 'คุณสมบัติหลัก',
        featureDraw: 'วาดและร่างภาพ: ทำเครื่องหมายไฟล์ด้วยสีปากกา ความหนา และความทึบที่กำหนดเอง',
        featureText: 'เพิ่มข้อความ: แทรกบล็อกข้อความได้ทุกที่เพื่อกรอกแบบฟอร์มหรือทิ้งความคิดเห็น',
        featureLocal: 'คลังในเครื่อง: บันทึกเอกสารและคำอธิบายประกอบอย่างปลอดภัยในฐานข้อมูลภายในเบราว์เซอร์ของคุณ',
        donateTitle: 'สนับสนุนโครงการ',
        donateBtn: 'สนับสนุนผ่านการบริจาค',
        donateDesc: 'หาก PDF Learn มีประโยชน์ต่อคุณ โปรดพิจารณา (สนับสนุน) นักพัฒนา!',
        headerPosition: 'ตำแหน่งส่วนหัว',
        headerTop: 'แสดงส่วนหัวด้านบน',
        headerBottom: 'แสดงส่วนหัวด้านล่าง',
        deviceScreenInfo: 'ข้อมูลหน้าจออุปกรณ์',
        openFullscreen: 'เปิดแบบเต็มจอ',
        exitFullscreen: 'ออกจากการแสดงผลเต็มจอ',
        fullscreenUnavailable: 'เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ',
        fullscreenError: 'ไม่สามารถเปิดโหมดเต็มจอได้',
    },
    zh: {
        libraryTitle: 'PDF 图书馆',
        addPdf: '添加 PDF',
        addExPdf: '加载示例 PDF',
        emptyLibrary: '图书馆为空',
        emptyLibrarySub: '上传文件以开始使用',
        drawings: '画作',
        texts: '文本',
        pageShort: '页',
        deleteConfirm: '确定要删除 "{name}" 以及所有图画/注释吗？',
        confirmClearAll: '确定要清空整个 PDF 图书馆和所有图画吗？',
        emptyHeader: '图书馆为空',
        selectOrUpload: '选择或上传 PDF 文件',
        closePdf: '关闭 PDF',
        settings: '设置',
        drawMode: '绘制模式',
        moveMode: '移动模式',
        toggleBrushSettings: '切换画笔设置',
        insertText: '插入文本',
        zoomOut: '缩小',
        zoomIn: '放大',
        prevPage: '上一页',
        nextPage: '下一页',
        goToPage: '转到页面',
        undo: '撤销',
        clearPage: '清除页面',
        tapToPlace: '点击以放置文本',
        loading: '加载中',
        localData: '本地数据',
        painting: '绘画',
        deleteLocalData: '删除本地数据',
        cancel: '取消',
        ok: '确定',
        useColor: '使用画笔颜色',
        penSize: '画笔大小',
        opacity: '不透明度',
        savedLocally: '已保存',
        pages: '页',
        confirmClosePdf: '关闭当前的 PDF？',
        aboutTitle: '关于 PDF Learn',
        aboutDesc: 'PDF Learn 是一个安全、快速且完全免费的工具，可直接在浏览器中编辑 PDF。无需安装任何软件，即可进行绘制、书写、签名和批注。',
        privacyNote: '100% 隐私保护：所有处理均在您的设备本地完成。您的文档绝不会上传到任何服务器。',
        featuresTitle: '核心功能',
        featureDraw: '绘制与草图：使用自定义画笔颜色、粗细和不透明度标记文件。',
        featureText: '添加文本：在任意位置插入文本块以填写表单或留下评论。',
        featureLocal: '本地资料库：将文档和注释安全地保存在浏览器的本地数据库中。',
        donateTitle: '支持该项目',
        donateBtn: '赞助支持',
        donateDesc: '如果 PDF Learn 对您有所帮助，请考虑支持开发者！',
        headerPosition: '标题栏位置',
        headerTop: '在顶部显示标题栏',
        headerBottom: '在底部显示标题栏',
        deviceScreenInfo: '设备屏幕信息',
        openFullscreen: '进入全屏',
        exitFullscreen: '退出全屏',
        fullscreenUnavailable: '当前浏览器不支持全屏模式。',
        fullscreenError: '无法开启全屏模式。',
    }
};

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

    const newId = crypto.randomUUID()
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
