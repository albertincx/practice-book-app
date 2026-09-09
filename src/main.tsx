import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'

import App from './App.tsx'
import { ReloadPrompt } from './components/ReloadPrompt.tsx';
import {ModalProvider} from "./components/Modal.tsx";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

const A = () => {
  return (
      <>
        <ModalProvider>
            <App />
        </ModalProvider>
      </>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><A /><ReloadPrompt /></StrictMode>)
// createRoot(document.getElementById('root')!).render(<A />)
