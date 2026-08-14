import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path'

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
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                new_app: resolve(__dirname, 'dev.html'),
            },
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]'
            }
        }
    }
})
