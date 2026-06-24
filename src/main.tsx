import 'ai-app-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css'
import App from './app'
import { registerServiceWorker } from './pwa-register'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

registerServiceWorker()
