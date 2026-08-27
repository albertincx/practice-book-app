import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path'
import {VitePWA} from "vite-plugin-pwa";

const now = new Date()
const buildDate = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`

export default ({mode}: any) => defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt', // Ключевой параметр: не обновлять автоматически
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // Кэшируем весь билд
            },
            manifest: {
                name: 'PDF Learn — Draw and Annotate PDF Online',
                short_name: 'App',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'web-app-manifest-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                ],
            },
        }),
    ],
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
