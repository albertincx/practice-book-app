import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

const now = new Date()
const buildDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`

export default ({mode}: any) => defineConfig({
    plugins: [react()],
    define: {
        __MODE__: JSON.stringify(mode),
        __APP_VERSION__: JSON.stringify(buildDate),
    },
    esbuild: mode === 'production' ? {
        drop: [
            'console',
            'debugger'
        ],
    } : {
        supported: {
            'top-level-await': true
        },
    },
})
